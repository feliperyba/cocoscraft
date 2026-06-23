/****************************************************************************
 Copyright (c) 2020-2023 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

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
****************************************************************************/

#include "WGPUPipelineLayout.h"
#include <emscripten/html5_webgpu.h>
#include "WGPUDescriptorSetLayout.h"
#include "WGPUDevice.h"
#include "WGPUObject.h"
#include "base/std/container/vector.h"

namespace cc {
namespace gfx {

ccstd::map<ccstd::hash_t, void *> CCWGPUPipelineLayout::layoutMap;

using namespace emscripten;

CCWGPUPipelineLayout::CCWGPUPipelineLayout() : PipelineLayout() {
}

CCWGPUPipelineLayout::~CCWGPUPipelineLayout() {
    doDestroy();
}

void CCWGPUPipelineLayout::doInit(const PipelineLayoutInfo &info) {
    _gpuPipelineLayoutObj = ccnew CCWGPUPipelineLayoutObject;
}

void CCWGPUPipelineLayout::validateLimitCompliance() const {
    // Per-stage counters: index by [shader_stage][resource_type]
    // Shader stages: 0=vertex, 1=fragment, 2=compute
    // Resource types: 0=sampler, 1=uniform buffer, 2=storage buffer,
    //                 3=sampled texture, 4=storage texture
    uint32_t counts[3][5] = {{0}};

    auto stageIndex = [](WGPUShaderStageFlags vis) -> int {
        if (vis & WGPUShaderStage_Vertex) return 0;
        if (vis & WGPUShaderStage_Fragment) return 1;
        if (vis & WGPUShaderStage_Compute) return 2;
        return -1;
    };

    for (size_t i = 0; i < _setLayouts.size(); i++) {
        if (_setLayouts[i] == nullptr) continue;
        auto *dsl = static_cast<CCWGPUDescriptorSetLayout *>(_setLayouts[i]);
        const auto &entries = dsl->gpuLayoutEntryObject()->bindGroupLayoutEntries;
        for (const auto &kv : entries) {
            const WGPUBindGroupLayoutEntry &entry = kv.second;
            int sIdx = stageIndex(entry.visibility);
            if (sIdx < 0) continue;
            if (entry.sampler.type != WGPUSamplerBindingType_Undefined) counts[sIdx][0]++;
            if (entry.buffer.type != WGPUBufferBindingType_Undefined) {
                if (entry.buffer.type == WGPUBufferBindingType_Uniform) counts[sIdx][1]++;
                else counts[sIdx][2]++;
            }
            if (entry.texture.sampleType != WGPUTextureSampleType_Undefined) counts[sIdx][3]++;
            if (entry.storageTexture.access != WGPUStorageTextureAccess_Undefined) counts[sIdx][4]++;
        }
    }

    WGPUSupportedLimits limits{};
    WGPUDevice device = CCWGPUDevice::getInstance()->gpuDeviceObject()->wgpuDevice;
    if (device == nullptr) return;
    if (!wgpuDeviceGetLimits(device, &limits)) return;
    const auto &l = limits.limits;

    const char *stageNames[] = {"Vertex", "Fragment", "Compute"};
    for (int s = 0; s < 3; s++) {
        if (counts[s][0] > l.maxSamplersPerShaderStage) {
            printf("[WGPU WARN] %s stage: %u samplers exceeds limit %u\n",
                   stageNames[s], counts[s][0], (uint32_t)l.maxSamplersPerShaderStage);
        }
        if (counts[s][1] + counts[s][2] > l.maxUniformBuffersPerShaderStage + l.maxStorageBuffersPerShaderStage) {
            printf("[WGPU WARN] %s stage: %u buffers exceed combined limit %u\n",
                   stageNames[s], counts[s][1] + counts[s][2],
                   (uint32_t)(l.maxUniformBuffersPerShaderStage + l.maxStorageBuffersPerShaderStage));
        }
        if (counts[s][3] + counts[s][4] > l.maxSampledTexturesPerShaderStage + l.maxStorageTexturesPerShaderStage) {
            printf("[WGPU WARN] %s stage: %u textures exceed combined limit %u\n",
                   stageNames[s], counts[s][3] + counts[s][4],
                   (uint32_t)(l.maxSampledTexturesPerShaderStage + l.maxStorageTexturesPerShaderStage));
        }
    }
}

void CCWGPUPipelineLayout::prepare(const ccstd::set<uint8_t> &setInUse) {
    ccstd::hash_t hash = _setLayouts.size() * 2 + 1;
    ccstd::hash_combine(hash, _setLayouts.size());
    ccstd::vector<WGPUBindGroupLayout> layouts;
    for (size_t i = 0; i < _setLayouts.size(); i++) {
        auto *descriptorSetLayout = static_cast<CCWGPUDescriptorSetLayout *>(_setLayouts[i]);
        if (setInUse.find(i) == setInUse.end()) {
            // give it default bindgrouplayout if not in use
            layouts.push_back(static_cast<WGPUBindGroupLayout>(CCWGPUDescriptorSetLayout::defaultBindGroupLayout()));
            ccstd::hash_combine(hash, i);
            ccstd::hash_combine(hash, 9527);
        } else {
            if (!descriptorSetLayout->gpuLayoutEntryObject()->bindGroupLayout) {
                printf("[WGPU WARN] bgl in ppl is null, falling back to default bind group layout\n");
                layouts.push_back(static_cast<WGPUBindGroupLayout>(CCWGPUDescriptorSetLayout::defaultBindGroupLayout()));
                ccstd::hash_combine(hash, i);
                ccstd::hash_combine(hash, 9527);
                continue;
            }
            layouts.push_back(descriptorSetLayout->gpuLayoutEntryObject()->bindGroupLayout);
            ccstd::hash_combine(hash, i);
            ccstd::hash_combine(hash, descriptorSetLayout->getHash());
        }
    }

    _hash = hash;

    // Defensive: log warnings if per-stage binding counts exceed adapter limits.
    validateLimitCompliance();

    WGPUPipelineLayoutDescriptor descriptor = {
        .nextInChain = nullptr,
        .label = nullptr,
        .bindGroupLayoutCount = layouts.size(),
        .bindGroupLayouts = layouts.data(),
    };
    if (layoutMap.find(hash) != layoutMap.end()) {
        _gpuPipelineLayoutObj->wgpuPipelineLayout = static_cast<WGPUPipelineLayout>(layoutMap[hash]);
    } else {
        _gpuPipelineLayoutObj->wgpuPipelineLayout = wgpuDeviceCreatePipelineLayout(CCWGPUDevice::getInstance()->gpuDeviceObject()->wgpuDevice, &descriptor);
        layoutMap.emplace(hash, _gpuPipelineLayoutObj->wgpuPipelineLayout);
    }
}

void CCWGPUPipelineLayout::doDestroy() {
    if (_gpuPipelineLayoutObj) {
        if (_gpuPipelineLayoutObj->wgpuPipelineLayout) {
            wgpuPipelineLayoutRelease(_gpuPipelineLayoutObj->wgpuPipelineLayout);
        }
        delete _gpuPipelineLayoutObj;
    }
}

} // namespace gfx
} // namespace cc
