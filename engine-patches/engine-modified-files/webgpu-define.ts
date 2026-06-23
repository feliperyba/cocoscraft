/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable func-names */
/*
 Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights to
 use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 of the Software, and to permit persons to whom the Software is furnished to do so,
 subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
*/

import { WEBGPU } from 'internal:constants';
import { gfx, webgpuAdapter, glslangWasmModule, promiseForWebGPUInstantiation, twgslModule } from '../../webgpu/instantiated';
import {
    Texture, CommandBuffer, DescriptorSet, Device, InputAssembler, Buffer, Shader
} from './override';
import {
    DeviceInfo, BufferTextureCopy, ShaderInfo, ShaderStageFlagBit, TextureViewInfo, TextureInfo, DrawInfo, BufferViewInfo, BufferInfo, BufferUsageBit, IndirectBuffer,
    DescriptorType, DescriptorSetLayoutInfo,
} from '../base/define';

import { ccwindow } from '../../core/global-exports';


WEBGPU && promiseForWebGPUInstantiation.then(() => {
    // === UBO overflow -> read-only storage buffer conversion ============================
    //
    // WebGPU guarantees maxUniformBuffersPerShaderStage >= 12, but some adapters cap
    // exactly at 12. Cocos shaders can exceed this in complex materials (lighting,
    // post-processing). When a DescriptorSetLayout would push a stage over the limit,
    // we convert the overflow UBO bindings to read-only storage buffers
    // (`var<storage, read>`), which draw from a separate budget (>=8 per stage) and
    // can carry the same struct types as UBOs for read-only access. This is the
    // standard WebGPU overflow pattern.
    //
    // Coordination:
    //   - `createDescriptorSetLayout` (patched below) counts UBOs per stage and, on
    //     overflow, mutates the offending bindings UNIFORM_BUFFER -> STORAGE_BUFFER
    //     and records the binding numbers here.
    //   - `createShader` (patched below) consults this registry after twgsl produces
    //     WGSL and rewrites the matching `var<uniform>` -> `var<storage, read>`.
    //
    // Known limitations (acceptable for v1):
    //   - Race: if createShader runs before createDescriptorSetLayout for a given
    //     shader, the registry is empty and no rewrite happens. validateLimitCompliance
    //     will still warn and a reload picks it up. A deferred-recompile mechanism
    //     would fix this; out of scope here.
    //   - Unbounded growth: the registry is never cleared. Bounded in practice by the
    //     number of distinct overflow bindings in a scene. A future scene-load or
    //     device-destroy hook should clear it.
    let maxUBOPerStage = 12; // WebGPU guaranteed minimum; overwritten from device.limits in initialize()

    // countUBOsPerStage: counts UBOs per shader stage from a single DescriptorSetLayout's bindings.
    function countUBOsPerStage(
        bindings: ReadonlyArray<{ binding: number; descriptorType: DescriptorType; stageFlags: number }>,
    ): { vertex: number; fragment: number; compute: number; maxStage: 'vertex' | 'fragment' | 'compute' | null } {
        const counts = { vertex: 0, fragment: 0, compute: 0 };
        for (const b of bindings) {
            const isUBO = b.descriptorType === DescriptorType.UNIFORM_BUFFER
                || b.descriptorType === DescriptorType.DYNAMIC_UNIFORM_BUFFER;
            if (!isUBO) continue;
            if (b.stageFlags & ShaderStageFlagBit.VERTEX) counts.vertex++;
            if (b.stageFlags & ShaderStageFlagBit.FRAGMENT) counts.fragment++;
            if (b.stageFlags & ShaderStageFlagBit.COMPUTE) counts.compute++;
        }
        let maxStage: 'vertex' | 'fragment' | 'compute' | null = null;
        let maxCount = 0;
        (['vertex', 'fragment', 'compute'] as const).forEach((s) => {
            if (counts[s] > maxCount) { maxCount = counts[s]; maxStage = s; }
        });
        return { ...counts, maxStage };
    }

    // Rewrite `var<uniform>` -> `var<storage, read>` for any (group, binding) recorded
    // in the registry. WGSL storage buffers accept the same struct types as UBOs for
    // read-only access, so only the binding descriptor on the variable declaration
    // needs to change; struct definitions are left untouched.
    function applyUBOConversions(wgsl: string): string {
        if (uboOverflowConversions.size === 0 || wgsl.length === 0) return wgsl;
        let converted = 0;
        const result = wgsl.replace(
            /@group\((\d+)\)\s+@binding\((\d+)\)\s+var\s*<uniform>/g,
            (match, groupStr, bindingStr) => {
                const group = parseInt(groupStr, 10);
                const binding = parseInt(bindingStr, 10);
                if (shouldConvertUBO(group, binding)) {
                    converted++;
                    console.log(`[WGPU] UBO overflow: converting group ${group} binding ${binding} from <uniform> to <storage, read>`);
                    return `@group(${group}) @binding(${binding}) var<storage, read>`;
                }
                return match;
            },
        );
        if (converted > 0) {
            console.log(`[WGPU] UBO overflow: applied ${converted} binding conversion(s) in shader stage`);
        }
        return result;
    }
    // === end UBO overflow conversion ====================================================

    const originDeviceInitializeFunc = Device.prototype.initialize;
    Device.prototype.initialize = function (info: DeviceInfo) {
        const adapter = webgpuAdapter.adapter;
        const device = webgpuAdapter.device;
        gfx.preinitializedWebGPUDevice = device;
        device.lost.then((info) => {
            console.error('Device was lost.', info);
            throw new Error('Something bad happened');
        });
        console.log(adapter);

        // Log actual device limits for diagnostic purposes (requiredLimits are not
        // explicitly requested in cocos/webgpu/instantiated.ts, so the device silently
        // uses WebGPU defaults). Surfacing the resolved limits here makes that visible.
        if (device.limits) {
            const limits = device.limits;
            console.log('[CCWGPUDevice] WebGPU limits:',
                '\n  maxSamplersPerShaderStage:', limits.maxSamplersPerShaderStage,
                '\n  maxUniformBuffersPerShaderStage:', limits.maxUniformBuffersPerShaderStage,
                '\n  maxStorageBuffersPerShaderStage:', limits.maxStorageBuffersPerShaderStage,
                '\n  maxSampledTexturesPerShaderStage:', limits.maxSampledTexturesPerShaderStage,
                '\n  maxStorageTexturesPerShaderStage:', limits.maxStorageTexturesPerShaderStage,
                 '\n  maxUniformBufferBindingSize:', limits.maxUniformBufferBindingSize,
                 '\n  minUniformBufferOffsetAlignment:', limits.minUniformBufferOffsetAlignment,
                 '\n  maxTextureDimension2D:', limits.maxTextureDimension2D);

            // Capture the resolved per-stage UBO limit so createDescriptorSetLayout can
            // convert overflow bindings to storage buffers using the adapter's real cap
            // rather than the conservative default of 12.
            if (typeof limits.maxUniformBuffersPerShaderStage === 'number') {
                maxUBOPerStage = limits.maxUniformBuffersPerShaderStage;
                console.log(`[CCWGPUDevice] UBO overflow conversion threshold set to ${maxUBOPerStage}`);
            }
        }

        originDeviceInitializeFunc.call(this, info);

        return true;
    };

    Device.prototype.flushCommands = function () {
    };

    const oldCreateTexture = Device.prototype.createTexture;
    Device.prototype.createTexture = function (info: TextureInfo | TextureViewInfo) {
        if ('texture' in info) {
            return this.createTextureView(info);
        } else {
            return oldCreateTexture.call(this, info);
        }
    };

    const oldCreateBuffer = Device.prototype.createBuffer;
    Device.prototype.createBuffer = function (info: BufferInfo | BufferViewInfo) {
        if ('buffer' in info) {
            return this.createBufferView(info);
        } else {
            return oldCreateBuffer.call(this, info);
        }
    };

    // Patch createDescriptorSetLayout to detect UBO overflow per shader stage and
    // convert the overflow bindings from UNIFORM_BUFFER to STORAGE_BUFFER before
    // the WebGPU backend builds the binding layout. The same binding numbers are
    // recorded in uboOverflowConversions so createShader can rewrite the matching
    // `var<uniform>` -> `var<storage, read>` in the generated WGSL. Without this,
    // shaders exceeding maxUniformBuffersPerShaderStage fail WebGPU validation.
    const originCreateDescriptorSetLayout = Device.prototype.createDescriptorSetLayout;
    Device.prototype.createDescriptorSetLayout = function (info: Readonly<DescriptorSetLayoutInfo>) {
        const { vertex, fragment, compute, maxStage } = countUBOsPerStage(info.bindings);
        const maxCount = Math.max(vertex, fragment, compute);
        if (maxStage && maxCount > maxUBOPerStage) {
            const stageBit = maxStage === 'vertex' ? ShaderStageFlagBit.VERTEX
                : maxStage === 'fragment' ? ShaderStageFlagBit.FRAGMENT
                    : ShaderStageFlagBit.COMPUTE;

            // Candidate UBOs for conversion: those that participate in the overflowing
            // stage. Sorted by binding number descending so we convert the highest-
            // numbered slots first (typically the least-shared, most-material-specific
            // UBOs, e.g. material params in the higher binding range).
            const candidates: Array<{ idx: number; binding: number }> = [];
            for (let i = 0; i < info.bindings.length; ++i) {
                const b = info.bindings[i];
                const isUBO = b.descriptorType === DescriptorType.UNIFORM_BUFFER
                    || b.descriptorType === DescriptorType.DYNAMIC_UNIFORM_BUFFER;
                if (isUBO && (b.stageFlags & stageBit)) {
                    candidates.push({ idx: i, binding: b.binding });
                }
            }
            candidates.sort((a, b) => b.binding - a.binding);

            const overflowCount = maxCount - maxUBOPerStage;
            const toConvert = candidates.slice(0, overflowCount);

            console.log(`[WGPU] UBO overflow: ${maxStage} stage has ${maxCount} UBOs (limit ${maxUBOPerStage}), converting ${toConvert.length} to STORAGE_BUFFER`);

            for (const c of toConvert) {
                // Mutate the binding's descriptor type so the WebGPU backend creates a
                // storage buffer binding slot instead of a uniform buffer slot. The
                // engine already fully supports storage buffers on the C++ side, so no
                // other layout change is needed.
                info.bindings[c.idx].descriptorType = DescriptorType.STORAGE_BUFFER;
                // Record in the global registry with set = -1 (wildcard): DescriptorSetLayoutInfo
                // doesn't carry the set number, so we match purely on binding number when
                // rewriting the WGSL.
                uboOverflowConversions.add(uboConversionKey(-1, c.binding));
                console.log(`[WGPU] UBO overflow: layout binding ${c.binding} -> STORAGE_BUFFER (recorded as set=-1, binding=${c.binding})`);
            }
        }

        return originCreateDescriptorSetLayout.call(this, info);
    };

    const oldDraw = CommandBuffer.prototype.draw;
    CommandBuffer.prototype.draw = function (info: DrawInfo | typeof InputAssembler) {
        if ('attributesHash' in info) {
            return this.draw(info.drawInfo);
        } else {
            return this.drawByInfo(info);
        }
    };

    const oldUpdateBuffer = Buffer.prototype.update;
    Buffer.prototype.update = function (data: BufferSource, size?: number) {
        if (this.usage & BufferUsageBit.INDIRECT) {
            this.updateIndirect(((data as unknown) as IndirectBuffer).drawInfos);
        } else {
            const updateSize = size === undefined ? data.byteLength : size;
            if ('buffer' in data) {
                oldUpdateBuffer.call(this, new Uint8Array(data.buffer, data.byteOffset, data.byteLength), updateSize);
            } else {
                oldUpdateBuffer.call(this, new Uint8Array(data), updateSize);
            }
        }

    };

    const oldCmdUpdateBuffer = CommandBuffer.prototype.updateBuffer;
    CommandBuffer.prototype.updateBuffer = function (buffer: typeof Buffer, data: BufferSource, size?: number) {
        if (this.usage & BufferUsageBit.INDIRECT) {
            this.updateIndirect(buffer, ((data as unknown) as IndirectBuffer).drawInfos);
        } else {
            const updateSize = size === undefined ? data.byteLength : size;
            if ('buffer' in data) {
                oldCmdUpdateBuffer.call(this, buffer, new Uint8Array(data.buffer, data.byteOffset, data.byteLength), updateSize);
            } else {
                oldCmdUpdateBuffer.call(this, buffer, new Uint8Array(data), updateSize);
            }
        }
    };

    const oldBindDescriptorSet = CommandBuffer.prototype.bindDescriptorSet;
    CommandBuffer.prototype.bindDescriptorSet = function (set: number, descriptorSet: typeof DescriptorSet, dynamicOffsets?: Readonly<number[]>) {
        if (dynamicOffsets === undefined) {
            oldBindDescriptorSet.call(this, set, descriptorSet, []);
        } else if ('buffer' in dynamicOffsets) {
            oldBindDescriptorSet.call(this, set, descriptorSet, new Uint32Array((dynamicOffsets as any).buffer, (dynamicOffsets as any).byteOffset, (dynamicOffsets as any).byteLength));
        } else {
            oldBindDescriptorSet.call(this, set, descriptorSet, new Uint32Array(dynamicOffsets));
        }
    };

    const oldCmdCopyBuffersToTexture = CommandBuffer.prototype.copyBuffersToTexture;
    CommandBuffer.prototype.copyBuffersToTexture = function (buffers: Readonly<ArrayBufferView[]>, texture: typeof Texture, regions: Readonly<BufferTextureCopy[]>) {
        const ucharBuffers: Uint8Array[] = [];
        const buffSize = buffers.length
        for (let i = 0; i < buffSize; ++i) {
            const buffer = buffers[i];
            if ('buffer' in buffer) {
                ucharBuffers.push(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));
            } else {
                ucharBuffers.push(new Uint8Array(buffer as any));
            }
        }
        oldCmdCopyBuffersToTexture.call(this, ucharBuffers, texture, regions);
    };

    const oldDeviceCopyBuffersToTexture = Device.prototype.copyBuffersToTexture;
    Device.prototype.copyBuffersToTexture = function (buffers: Readonly<ArrayBufferView[]>, texture: typeof Texture, regions: Readonly<BufferTextureCopy[]>) {
        const ucharBuffers: Uint8Array[] = [];
        const buffSize = buffers.length;
        for (let i = 0; i < buffSize; ++i) {
            const buffer = buffers[i];
            if ('buffer' in buffer) {
                ucharBuffers.push(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));
            } else {
                ucharBuffers.push(new Uint8Array(buffer as any));
            }
        }
        oldDeviceCopyBuffersToTexture.call(this, ucharBuffers, texture, regions);
    };

    Device.prototype.copyTexImagesToTexture = function (texImages: TexImageSource[], texture: typeof Texture, regions: BufferTextureCopy[]) {
        const buffers: Uint8Array[] = [];
        const regionSize = regions.length;
        for (let i = 0; i < regionSize; i++) {
            if ('getContext' in texImages[i]) {
                const canvasElem = texImages[i] as HTMLCanvasElement;
                const imageData = canvasElem.getContext('2d')?.getImageData(0, 0, texImages[i].width, texImages[i].height);
                const buff = imageData!.data.buffer;
                let data;
                let rawBuffer;
                if ('buffer' in buff) {
                    // es-lint as any
                    data = new Uint8Array((buff as any).buffer, (buff as any).byteOffset, (buff as any).byteLength);
                } else {
                    rawBuffer = buff;
                    data = new Uint8Array(rawBuffer);
                }
                buffers[i] = data;
            } else if (texImages[i] instanceof HTMLImageElement || texImages[i] instanceof ImageBitmap) {
                const img = texImages[i];
                const canvas = ccwindow.document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img as any, 0, 0);
                const imageData = ctx?.getImageData(0, 0, img.width, img.height);
                const buff = imageData!.data.buffer;
                let data;
                let rawBuffer;
                if ('buffer' in buff) {
                    // es-lint as any
                    data = new Uint8Array((buff as any).buffer, (buff as any).byteOffset, (buff as any).byteLength);
                } else {
                    rawBuffer = buff;
                    data = new Uint8Array(rawBuffer);
                }
                buffers[i] = data;
            } else {
                console.warn('imageBmp copy not impled!');
            }
        }

        oldDeviceCopyBuffersToTexture.call(this, buffers, texture, regions);
    };

    const SEPARATE_SAMPLER_BINDING_OFFSET = 16;

    // Shared sampler slots per set (within the [16..31] range — max 3 categories per set).
    // All textures in the same set with the same category share a single sampler binding,
    // drastically reducing sampler pressure against WebGPU's maxSamplersPerShaderStage = 16.
    const SLOT_FILTERING = 0;       // binding 16: linear/repeat (color textures)
    const SLOT_NON_FILTERING = 1;   // binding 17: point/clamp (depth reads via textureLoad)
    const SLOT_COMPARISON = 2;      // binding 18: comparison (shadow maps via textureSampleCompare)

    // Heuristic classification of a texture name to its sampler category.
    // The GLSL `sampler2D X` declaration carries no sampler state, so we infer it from the name.
    // This covers the vast majority of Cocos built-in materials; per-binding sampler state can
    // be layered on top later if needed.
    function classifySampler(textureName: string): number {
        const lower = textureName.toLowerCase();
        if (lower.includes('shadow')) return SLOT_COMPARISON;
        if (lower.includes('depth')) return SLOT_NON_FILTERING;
        return SLOT_FILTERING;
    }

    // Tracks non-filtering texture variable names (depth reads) discovered during
    // GLSL rewriting of the current shader. Consumed after WGSL generation to
    // convert `textureSample(depthTex, ...)` → `textureSampleLevel(depthTex, ..., 0.0)`.
    // This is REQUIRED because depth textures bind with WGPUTextureSampleType_UnfilterableFloat,
    // and `textureSample` only works with filterable-float textures. `textureSampleLevel`
    // works with any sampleType. Cleared at the start of each createShader call.
    const nonFilteringTextureNames = new Set<string>();

    // Convert textureSample() → textureSampleLevel(..., 0.0) for non-filtering textures.
    // Handles balanced parentheses correctly. Only converts calls whose first argument
    // is a known non-filtering texture variable.
    function convertDepthTextureSampleToLevel(wgsl: string, depthNames: Set<string>): string {
        if (depthNames.size === 0 || wgsl.length === 0) return wgsl;
        let result = wgsl;
        for (const texName of depthNames) {
            const pattern = 'textureSample(';
            let searchFrom = 0;
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const callIdx = result.indexOf(pattern, searchFrom);
                if (callIdx === -1) break;
                const argsStart = callIdx + pattern.length;
                // Skip whitespace
                let i = argsStart;
                while (i < result.length && /\s/.test(result[i])) i++;
                // Check if the first argument is our texture name
                if (result.startsWith(texName, i)) {
                    const afterName = i + texName.length;
                    // Must be followed by , or whitespace then ,
                    let j = afterName;
                    while (j < result.length && /\s/.test(result[j])) j++;
                    if (result[j] === ',') {
                        // Find the matching close paren of this textureSample() call
                        let depth = 1;
                        let closeIdx = argsStart;
                        while (closeIdx < result.length && depth > 0) {
                            const ch = result[closeIdx];
                            if (ch === '(') depth++;
                            else if (ch === ')') depth--;
                            closeIdx++;
                        }
                        if (depth === 0) {
                            // closeIdx is now just AFTER the closing ')'
                            const insideArgs = result.slice(argsStart, closeIdx - 1);
                            const replacement = `textureSampleLevel(${insideArgs}, 0.0)`;
                            result = result.slice(0, callIdx) + replacement + result.slice(closeIdx);
                            searchFrom = callIdx + replacement.length;
                            continue;
                        }
                    }
                }
                // Not a match — advance
                searchFrom = callIdx + 1;
            }
        }
        return result;
    }

    // Convert ALL remaining textureSample() → textureSampleLevel(..., 0.0).
    // This is the definitive fix for two WebGPU constraints:
    //   1. textureSample requires UNIFORM control flow — built-in PBR shaders sample
    //      cc_environment / cc_reflectionProbeCubemap in non-uniform flow (depending
    //      on v_shadowBiasAndProbeId), causing WGSL compilation failure.
    //   2. textureSample requires FLOAT sampleType — depth textures bind with
    //      UnfilterableFloat, causing validation errors.
    // textureSampleLevel works in ANY control flow and with ANY sampleType.
    // The cost: no automatic mip-level selection (always level 0). For voxel-game
    // rendering (point-filtered textures, no mipmaps), this is acceptable.
    function convertAllTextureSampleToLevel(wgsl: string): string {
        if (wgsl.length === 0) return wgsl;
        // First, convert depth-specific ones (tracked by name) — same as above
        // but we skip that here since convertAll is a superset.
        let result = wgsl;
        const pattern = 'textureSample(';
        let searchFrom = 0;
        let count = 0;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const callIdx = result.indexOf(pattern, searchFrom);
            if (callIdx === -1) break;
            const argsStart = callIdx + pattern.length;
            // Find matching close paren
            let depth = 1;
            let closeIdx = argsStart;
            while (closeIdx < result.length && depth > 0) {
                const ch = result[closeIdx];
                if (ch === '(') depth++;
                else if (ch === ')') depth--;
                closeIdx++;
            }
            if (depth !== 0) {
                searchFrom = callIdx + 1;
                continue;
            }
            const insideArgs = result.slice(argsStart, closeIdx - 1);
            const replacement = `textureSampleLevel(${insideArgs}, 0.0)`;
            result = result.slice(0, callIdx) + replacement + result.slice(closeIdx);
            searchFrom = callIdx + replacement.length;
            count++;
        }
        if (count > 0) {
            console.log(`[WGPU] Converted ${count} textureSample → textureSampleLevel calls`);
        }
        return result;
    }

    function sharedSamplerVarName(set: number, slot: number): string {
        const suffix = slot === SLOT_FILTERING ? 'f'
            : slot === SLOT_NON_FILTERING ? 'n'
                : 'c';
        return `_cc_sharedSampler_${suffix}_${set}`;
    }

    function seperateCombinedSamplerTexture(shaderSource: string) {
        // Declaration regex: layout(set = N, binding = M) uniform [precision] samplerTYPE NAME;
        // Captures: 1 = set, 2 = binding, 3 = type suffix (e.g. "2D", "2DArray", "2DShadow"), 4 = name
        const declRegex = /layout\s*\(\s*set\s*=\s*(\d+)\s*,\s*binding\s*=\s*(\d+)\s*\)\s*uniform[^;]*\ssampler(\w+)\s+(\w+)\s*;/g;

        // === Phase 0: Scan sampler declarations, classify each texture, track used shared samplers ===
        const textureInfo = new Map<string, { set: number; typeSuffix: string; slot: number; sampler: string }>();
        const usedSamplers = new Map<string, { set: number; slot: number; sampler: string }>(); // key: `${set}:${slot}`

        const scanRegex = new RegExp(declRegex.source, 'g');
        let scanMatch: RegExpExecArray | null;
        while ((scanMatch = scanRegex.exec(shaderSource)) !== null) {
            const set = parseInt(scanMatch[1], 10);
            const typeSuffix = scanMatch[3];
            const texName = scanMatch[4];
            const slot = classifySampler(texName);
            const sampler = sharedSamplerVarName(set, slot);
            textureInfo.set(texName, { set, typeSuffix, slot, sampler });
            // Track non-filtering (depth) texture names so WGSL post-processing can
            // convert textureSample() → textureSampleLevel(..., 0.0) for them.
            if (slot === SLOT_NON_FILTERING) {
                nonFilteringTextureNames.add(texName);
            }
            const key = `${set}:${slot}`;
            if (!usedSamplers.has(key)) {
                usedSamplers.set(key, { set, slot, sampler });
            }
        }

        // === Phase A: Rewrite each combined sampler declaration into a texture-only declaration ===
        const replaceRegex = new RegExp(declRegex.source, 'g');
        let code = shaderSource.replace(replaceRegex, (_match, setStr, bindingStr, typeSuffix, texName) => {
            return `layout(set = ${setStr}, binding = ${bindingStr}) uniform texture${typeSuffix} ${texName};`;
        });

        // === Phase B: Emit one shared sampler declaration per (set, category), prepended at the top ===
        const samplersBySet = new Map<number, { slot: number; sampler: string }[]>();
        for (const info of usedSamplers.values()) {
            if (!samplersBySet.has(info.set)) samplersBySet.set(info.set, []);
            samplersBySet.get(info.set)!.push({ slot: info.slot, sampler: info.sampler });
        }

        const samplerDecls: string[] = [];
        const sortedSets = Array.from(samplersBySet.keys()).sort((a, b) => a - b);
        for (const set of sortedSets) {
            const entries = samplersBySet.get(set)!.sort((a, b) => a.slot - b.slot);
            for (const e of entries) {
                const binding = SEPARATE_SAMPLER_BINDING_OFFSET + e.slot;
                samplerDecls.push(`layout(set = ${set}, binding = ${binding}) uniform sampler ${e.sampler};`);
            }
        }

        if (samplerDecls.length > 0) {
            const declStr = `${samplerDecls.join('\n')}\n`;
            if (code.startsWith('#version')) {
                const nl = code.indexOf('\n');
                code = `${code.slice(0, nl + 1)}${declStr}${code.slice(nl + 1)}`;
            } else {
                code = declStr + code;
            }
        }

        // === Phase C: GLSL built-in call rewriter ===
        // texture(NAME, ...) -> texture(samplerTYPE(NAME, samplerVar), ...)
        const builtinSample = ['texture', 'textureSize', 'texelFetch', 'textureLod'];
        const replaceBuiltin = function (texName: string, typeSuffix: string, target: string, samplerName: string) {
            builtinSample.forEach((sampleFunc) => {
                const reg = new RegExp(`${sampleFunc}\\s*\\(\\s*${texName}\\s*,`);
                let it = reg.exec(target);
                while (it) {
                    target = target.replace(it[0], `${sampleFunc}(sampler${typeSuffix}(${texName}, ${samplerName}),`);
                    it = reg.exec(target);
                }
            });
            return target;
        };

        // === Phase D: Function-parameter splitting (preserved from original; adapted for shared samplers) ===
        // void foo(sampler2D s) -> void foo(texture2D s, sampler s_sampler)
        // foo(tex)             -> foo(tex, <shared sampler if tex is global, else tex_sampler>)
        const funcReg = /\s([\S]+)\s*\(([\w\s,]+)\)[\s|\\|n]*{/g;
        let funcIter = funcReg.exec(code);
        const funcSet = new Set<string>();
        const paramInfoMap = new Map<string, { typeSuffix: string; sampler: string }>();

        while (funcIter) {
            paramInfoMap.clear();
            const params = funcIter[2];
            let paramsRes = params.slice();
            if (params.includes('sampler')) {
                const paramIndexSet = new Set<number>();
                const paramArr = params.split(',');
                const paramSize = paramArr.length;
                for (let i = 0; i < paramSize; ++i) {
                    const paramDecl = paramArr[i].split(' ');
                    const typeDecl = paramDecl[paramDecl.length - 2];
                    if (typeDecl.includes('sampler') && typeDecl !== 'sampler') {
                        const samplerTypeSuffix = typeDecl.replace('sampler', '');
                        const paramName = paramDecl[paramDecl.length - 1];
                        paramsRes = paramsRes.replace(paramArr[i], ` texture${samplerTypeSuffix} ${paramName}, sampler ${paramName}_sampler`);
                        paramIndexSet.add(i);
                        paramInfoMap.set(paramName, { typeSuffix: samplerTypeSuffix, sampler: `${paramName}_sampler` });
                    }
                }

                code = code.replace(params, paramsRes);

                const funcName = funcIter[1];
                // function may overload
                if (!funcSet.has(funcName)) {
                    const funcSamplerReg = new RegExp(`${funcName}\\s*?\\(\\s*([^;\\{]+)`, 'g');
                    const matches = code.matchAll(funcSamplerReg);
                    for (let matched of matches) {
                        if (!matched[1].match(/\b\w+\b\s*\b\w+\b/g)) {
                            const stripStr = matched[1][matched[1].length - 1] === ')' ? matched[1].slice(0, -1) : matched[1];
                            const callParams = stripStr.split(',');
                            let queued = 0; // '('
                            let paramIndex = 0;
                            const currParamsSize = callParams.length;
                            for (let i = 0; i < currParamsSize; ++i) {
                                if (callParams[i].includes('(')) {
                                    ++queued;
                                }
                                if (callParams[i].includes(')')) {
                                    --queued;
                                }

                                if (!queued || i === currParamsSize - 1) {
                                    if (paramIndexSet.has(paramIndex)) {
                                        // Look up the call argument's name to find its sampler
                                        const argName = callParams[i].trim();
                                        const isPlainIdent = /^[a-zA-Z_]\w*$/.test(argName);
                                        let samplerSuffix: string;
                                        if (isPlainIdent && textureInfo.has(argName)) {
                                            // Global texture: use its assigned shared sampler
                                            samplerSuffix = textureInfo.get(argName)!.sampler;
                                        } else {
                                            // Local function parameter: use its paired _sampler counterpart
                                            samplerSuffix = `${argName}_sampler`;
                                        }
                                        callParams[i] += `, ${samplerSuffix}`;
                                    }
                                    ++paramIndex;
                                }
                            }
                            const newParams = callParams.join(',');
                            const newInvokeStr = matched[0].replace(stripStr, newParams);
                            code = code.replace(matched[0], newInvokeStr);
                        }
                        // else: function declare
                    }
                }

                let count = 1;
                let startIndex = code.indexOf(funcIter[1], funcIter.index);
                startIndex = code.indexOf('{', startIndex) + 1;
                let endIndex = 0;
                while (count) {
                    if (code.at(startIndex) === '{') {
                        ++count;
                    } else if (code.at(startIndex) === '}') {
                        --count;
                    }

                    if (count === 0) {
                        endIndex = startIndex;
                        break;
                    }

                    const nextLeft = code.indexOf('{', startIndex + 1);
                    const nextRight = code.indexOf('}', startIndex + 1);
                    startIndex = nextLeft === -1 ? nextRight : Math.min(nextLeft, nextRight);
                }
                const funcBody = code.slice(funcIter.index, endIndex);
                let newFunc = funcBody;
                paramInfoMap.forEach((info, name) => {
                    newFunc = replaceBuiltin(name, info.typeSuffix, newFunc, info.sampler);
                });

                code = code.replace(funcBody, newFunc);
                funcSet.add(funcIter[1]);
            }
            funcIter = funcReg.exec(code);
        }

        // === Phase E: Top-level built-in rewrites for global textures ===
        textureInfo.forEach((info, name) => {
            code = replaceBuiltin(name, info.typeSuffix, code, info.sampler);
        });

        ///////////////////////////////////////////////////////////
        // isNan, isInf has been removed in dawn:tint

        let functionDefs = '';
        const precisionKeyWord = 'highp';
        const isNanIndex = code.indexOf('isnan');
        if (isNanIndex !== -1) {
            functionDefs += `\n
             bool isNan(${precisionKeyWord} float val) {
                 return (val < 0.0 || 0.0 < val || val == 0.0) ? false : true;
             }
             \n`;
            code = code.replace(/isnan\(/gi, 'isNan(');
        }

        const isInfIndex = code.indexOf('isinf');
        if (isInfIndex !== -1) {
            functionDefs += `\n
             bool isInf(${precisionKeyWord} float x) {
                 return x == x * 2.0 && x != 0.0;
             }
             \n`;
            code = code.replace(/isinf\(/gi, 'isInf(');
        }

        ///////////////////////////////////////////////////////////

        let firstPrecisionIdx = code.indexOf('precision');
        firstPrecisionIdx = code.indexOf(';', firstPrecisionIdx);
        firstPrecisionIdx += 1;
        code = `${code.slice(0, firstPrecisionIdx)}\n${functionDefs}\n${code.slice(firstPrecisionIdx)}`;

        return code;
    }

    function reflect(wgsl: string[]) {
        const bindingList: number[][] = [];
        for (let wgslStr of wgsl) {
            // @group(1) @binding(0) var<uniform> x_78 : Constants;
            // @group(1) @binding(1) var albedoMap : texture_2d<f32>;
            const reg = new RegExp(/@group\((\d)\)\s+@binding\((\d+)\)/g);
            let iter = reg.exec(wgslStr);
            while (iter) {
                const set = +iter[1];
                const binding = +iter[2];
                while (bindingList.length <= set) {
                    bindingList.push([]);
                }
                bindingList[set][bindingList[set].length] = binding;
                iter = reg.exec(wgslStr);
            }
        }
        return bindingList;
    }

    function overwriteBlock(info: ShaderInfo, code: string): string {
        const regexp = new RegExp(/layout\(([^\)]+)\)\s+uniform\s+\b(\w+)\b/g);
        let src = code;
        let iter = regexp.exec(src);
        if (iter) {
            const blockName = iter[2];
            const block = info.blocks.find((ele) => { return ele.name === blockName; });
            const binding = block?.binding;
            const overwriteStr = iter[0].replace(iter[1], `${iter[1]}, set = 0, binding = ${binding}`);
            src = src.replace(iter[0], overwriteStr);
            iter = regexp.exec(src);
        }
        return src;
    }

    const createShader = Device.prototype.createShader;
    Device.prototype.createShader = function (shaderInfo: ShaderInfo) {
        const wgslStages: string[] = [];
        const stageSize = shaderInfo.stages.length;
        for (let i = 0; i < stageSize; ++i) {
            let glslSource = seperateCombinedSamplerTexture(shaderInfo.stages[i].source);
            const stageStr = shaderInfo.stages[i].stage === ShaderStageFlagBit.VERTEX ? 'vertex'
                : shaderInfo.stages[i].stage === ShaderStageFlagBit.FRAGMENT ? 'fragment' : 'compute';
            // if (stageStr === 'compute') {
            //     glslSource = overwriteBlock(shaderInfo, glslSource);
            // }
            const sourceCode = `#version 450\n#define CC_USE_WGPU 1\n${glslSource}`;
            const spv = glslangWasmModule.glslang.compileGLSL(sourceCode, stageStr, false, '1.3');

            const twgsl = twgslModule.twgsl;
            // twgsl.convertSpirV2WGSL does not throw on failure (it captures output via an
            // Emscripten callback and returns '' when the C-side _spirv_to_wgsl produces
            // nothing useful); wrap it defensively and surface the offending GLSL/SPIRV so
            // the failure isn't swallowed behind a useless "empty wgsl" message.
            let wgsl: string;
            try {
                wgsl = twgsl.convertSpirV2WGSL(spv);
            } catch (e) {
                console.error(`twgsl SPIRV->WGSL conversion threw: ${e instanceof Error ? e.message : String(e)}`);
                console.error(`Shader stage: ${stageStr}, GLSL source (first 500 chars):\n${glslSource.slice(0, 500)}`);
                wgsl = '';
            }
            if (wgsl.length === 0) {
                console.error(`twgsl produced empty WGSL for ${stageStr} stage. SPIRV size: ${spv.length} bytes`);
                console.error(`Original GLSL (first 1000 chars):\n${glslSource.slice(0, 1000)}`);
            }
            // Apply UBO overflow conversions: rewrite var<uniform> -> var<storage, read>
            // for any (group, binding) registered by createDescriptorSetLayout. Runs
            // after WGSL generation (twgsl emits var<uniform> for SPIRV uniform buffers)
            // and before the source is handed to the native shader compiler.
            let finalWgsl = applyUBOConversions(wgsl);
            // Convert ALL textureSample() → textureSampleLevel(..., 0.0).
            // This is the definitive fix for:
            //   - Depth textures (UnfilterableFloat sampleType requires textureSampleLevel)
            //   - Non-uniform control flow (built-in PBR samples cc_environment /
            //     cc_reflectionProbeCubemap depending on non-uniform v_shadowBiasAndProbeId)
            // textureSampleLevel works in any control flow and with any sampleType.
            finalWgsl = convertAllTextureSampleToLevel(finalWgsl);
            shaderInfo.stages[i].source = finalWgsl;
            wgslStages.push(finalWgsl);
        }

        // Clear per-shader tracking state
        nonFilteringTextureNames.clear();

        const shader = this.createShaderNative(shaderInfo);
        // optioanl : reflect bindings in shader
        {
            const bindingList = reflect(wgslStages);
            for (let bindings of bindingList) {
                const u8Array = new Uint8Array(bindings);
                shader.reflectBinding(u8Array);
            }
        }
        return shader;
    };

    // if property being frequently get in TS, try cache it
    // attention: invalid if got this object from a native object,
    // eg. inputAssembler.indexBuffer.objectID
    function cacheReadOnlyWGPUProperties<T>(type: T, props: string[]) {
        const descriptor = { writable: true };
        props.map((prop) => {
            return Object.defineProperty(type['prototype'], `_${prop}`, descriptor);
        });

        // trick for emscripten object only, which contains a `name` indicates what type it is.
        const typename = type['name'].replace('CCWGPU', '');
        const oldCreate = Device.prototype[`create${typename}`];
        Device.prototype[`create${typename}`] = function (info) {
            const res = oldCreate.call(this, info);
            for (let prop of props) {
                res[`_${prop}`] = res[`${prop}`];
                Object.defineProperty(res, `${prop}`, {
                    get() {
                        return this[`_${prop}`];
                    }
                });
            }
            return res;
        }
        const oldInit = type['prototype']['initialize'];
        type['prototype']['initialize'] = function (info) {
            oldInit.call(this, info);
            for (let prop of props) {
                this[`_${prop}`] = this[`${prop}`];
            }
        }
    };

    cacheReadOnlyWGPUProperties(Buffer, ['objectID']);

});
