import { _decorator, Component, gfx, renderer, rendering, postProcess, Material, EffectAsset, Vec4, director } from 'cc';

const { ccclass, property } = _decorator;

let ssaoEffect: EffectAsset | null = null;
let ssrEffect: EffectAsset | null = null;
let volEffect: EffectAsset | null = null;
let passesRegistered = false;

// === SSAO Pass (unchanged, working) ===
class SSAOPass extends postProcess.SettingPass {
    name = 'SSAOPass';
    outputNames = ['SSAOColor'];
    get setting () { return null as any; }
    checkEnable (camera: renderer.scene.Camera): boolean { return ssaoEffect !== null && this.enable; }
    slotName (camera: renderer.scene.Camera, index = 0): string { return this.lastPass!.slotName(camera, index); }

    private _v4a = new Vec4();
    private _v4b = new Vec4();

    public render (camera: renderer.scene.Camera, ppl: rendering.Pipeline): void {
        if (!this.lastPass) return;
        const cameraID = this.getCameraUniqueID(camera);
        const inputRT = this.lastPass.slotName(camera, 0);
        const inputDS = this.lastPass.slotName(camera, 1);
        const ctx = this.context;
        ctx.material = this.material;
        const fovY = camera.fov * Math.PI / 180.0;
        const tFovY = Math.tan(fovY * 0.5);
        const tFovX = tFovY * (camera.window.width / camera.window.height);
        this.material.setProperty('uParams', this._v4a.set(camera.near, camera.far, 1.0 / camera.window.width, 1.0 / camera.window.height), 0);
        this.material.setProperty('uProj', this._v4b.set(tFovX, tFovY, 0.8, 0.1), 0);
        const aoRT = super.slotName(camera, 0);
        ctx.clearBlack();
        ctx.addRenderPass('post-process', `SSAOCompute${cameraID}`)
            .setPassInput(inputDS, 'depthTex').addRasterView(aoRT, gfx.Format.RGBA8).blitScreen(0).version();
        ctx.clearFlag = gfx.ClearFlagBit.NONE;
        ctx.addRenderPass('combine-pass', `SSAOCombine${cameraID}`)
            .setPassInput(aoRT, 'aoTex').addRasterView(inputRT, gfx.Format.RGBA8).blitScreen(1).version();
    }
    get material (): Material {
        if (!this._material) { this._material = new Material(); this._material.initialize({ effectAsset: ssaoEffect! }); }
        return this._material!;
    }
}

// === SSR Pass ===
class SSRPass extends postProcess.SettingPass {
    name = 'SSRPass';
    outputNames = ['SSRColor'];
    get setting () { return null as any; }
    checkEnable (camera: renderer.scene.Camera): boolean { return ssrEffect !== null && this.enable; }

    private _v4a = new Vec4();
    private _v4b = new Vec4();

    public render (camera: renderer.scene.Camera, ppl: rendering.Pipeline): void {
        if (!this.lastPass) return;
        const cameraID = this.getCameraUniqueID(camera);
        const inputRT = this.lastPass.slotName(camera, 0);
        const inputDS = this.lastPass.slotName(camera, 1);
        const ctx = this.context;
        ctx.material = this.material;
        const fovY = camera.fov * Math.PI / 180.0;
        const tFovY = Math.tan(fovY * 0.5);
        const tFovX = tFovY * (camera.window.width / camera.window.height);
        this.material.setProperty('uParams', this._v4a.set(camera.near, camera.far, 1.0 / camera.window.width, 1.0 / camera.window.height), 0);
        this.material.setProperty('uProj', this._v4b.set(tFovX, tFovY, 2.0, 0.5), 0);
        const output = super.slotName(camera, 0);
        ctx.clearBlack();
        ctx.addRenderPass('post-process', `SSR${cameraID}`)
            .setPassInput(inputRT, 'sceneColorTex')
            .setPassInput(inputDS, 'depthTex')
            .addRasterView(output, gfx.Format.RGBA8)
            .blitScreen(0).version();
    }
    get material (): Material {
        if (!this._material) { this._material = new Material(); this._material.initialize({ effectAsset: ssrEffect! }); }
        return this._material!;
    }
}

// === Volumetric Pass ===
class VolumetricPass extends postProcess.SettingPass {
    name = 'VolumetricPass';
    outputNames = ['VolLight'];
    get setting () { return null as any; }
    checkEnable (camera: renderer.scene.Camera): boolean { return volEffect !== null && this.enable; }

    private _v4a = new Vec4();
    private _v4b = new Vec4();

    public render (camera: renderer.scene.Camera, ppl: rendering.Pipeline): void {
        if (!this.lastPass) return;
        const cameraID = this.getCameraUniqueID(camera);
        const inputRT = this.lastPass.slotName(camera, 0);
        const inputDS = this.lastPass.slotName(camera, 1);
        const ctx = this.context;
        ctx.material = this.material;

        // Approximate sun screen position from light direction + camera forward
        let lightX = 0.5, lightY = 0.8;
        let r = 1.0, g = 0.9, b = 0.7;
        const scene = camera.scene;
        if (scene && scene.mainLight) {
            const light = scene.mainLight;
            const dir = light.direction;
            // Transform -dir (toward sun) to view space using matView
            const mv = camera.matView;
            const dx = -dir.x, dy = -dir.y, dz = -dir.z;
            const vz = mv.m02 * dx + mv.m06 * dy + mv.m10 * dz;
            if (vz < -0.01) {
                const vx = mv.m00 * dx + mv.m04 * dy + mv.m08 * dz;
                const vy = mv.m01 * dx + mv.m05 * dy + mv.m09 * dz;
                lightX = clamp01(0.5 - vx / vz * 0.5);
                lightY = clamp01(0.5 - vy / vz * 0.5);
            }
            const lc = light.color;
            if (lc) { r = lc.r; g = lc.g; b = lc.b; }
        }

        this.material.setProperty('uLight', this._v4a.set(lightX, lightY, 0.8, 0.94), 0);
        this.material.setProperty('uColor', this._v4b.set(r, g, b, 0.15), 0);
        const output = super.slotName(camera, 0);
        ctx.clearBlack();
        ctx.addRenderPass('post-process', `VolLight${cameraID}`)
            .setPassInput(inputRT, 'sceneColorTex')
            .setPassInput(inputDS, 'depthTex')
            .addRasterView(output, gfx.Format.RGBA8)
            .blitScreen(0).version();
    }
    get material (): Material {
        if (!this._material) { this._material = new Material(); this._material.initialize({ effectAsset: volEffect! }); }
        return this._material!;
    }
}

function clamp01 (v: number): number { return v < 0 ? 0 : v > 1 ? 1 : v; }

function registerPasses (): void {
    if (passesRegistered) return;
    if (!ssaoEffect) return;
    const builder = rendering.getCustomPipeline('Custom') as postProcess.PostProcessBuilder;
    if (!builder) { setTimeout(registerPasses, 200); return; }
    builder.insertPass(new SSAOPass(), postProcess.ForwardPass);
    // SSR and Volumetric disabled — require engine-level texture binding to water material
    // builder.insertPass(new SSRPass(), postProcess.ForwardTransparencyPass);
    // builder.insertPass(new VolumetricPass(), postProcess.ForwardTransparencyPass);
    passesRegistered = true;
    console.log('CustomRendering: All passes registered');
}

@ccclass('CustomRendering')
export class CustomRendering extends Component {
    @property(EffectAsset)
    ssaoEffect: EffectAsset | null = null;

    @property(EffectAsset)
    ssrEffect: EffectAsset | null = null;

    @property(EffectAsset)
    volumetricEffect: EffectAsset | null = null;

    onLoad(): void {
        if (this.ssaoEffect) { ssaoEffect = this.ssaoEffect; registerPasses(); }
        if (this.ssrEffect) ssrEffect = this.ssrEffect;
        if (this.volumetricEffect) volEffect = this.volumetricEffect;
    }

    start(): void {
        // Disable shading scale — it creates depth/color RT size mismatch on WebGPU in builds
        const PP = (postProcess as any).PostProcess;
        if (PP && Array.isArray(PP.all)) {
            for (const pp of PP.all) {
                pp.shadingScale = 1;
            }
        }
    }
}
