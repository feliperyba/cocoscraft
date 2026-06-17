import { _decorator, Component, gfx, renderer, rendering, postProcess, assetManager, Material, EffectAsset, Vec4 } from 'cc';

const { ccclass } = _decorator;

const SSAO_EFFECT_UUID = 'c9a0b203-0003-4b03-c003-c1c1c0000003';

let ssaoEffectAsset: EffectAsset | null = null;

// === Custom SSAO Pass ===
// Inserts into the built-in 'Custom' pipeline after the opaque ForwardPass
class SSAOPass extends postProcess.SettingPass {
    name = 'SSAOPass';
    outputNames = ['SSAOColor'];

    get setting () { return null as any; }

    checkEnable (camera: renderer.scene.Camera): boolean {
        return ssaoEffectAsset !== null && this.enable;
    }

    slotName (camera: renderer.scene.Camera, index = 0): string {
        return this.lastPass!.slotName(camera, index);
    }

    public render (camera: renderer.scene.Camera, ppl: rendering.Pipeline): void {
        if (!this.lastPass) return;
        const cameraID = this.getCameraUniqueID(camera);
        const inputRT = this.lastPass.slotName(camera, 0);
        const inputDS = this.lastPass.slotName(camera, 1);

        const ctx = this.context;
        ctx.material = this.material;

        const near = camera.near;
        const far = camera.far;
        const w = camera.window.width;
        const h = camera.window.height;
        const fovY = camera.fov * Math.PI / 180.0;
        const tanHalfFovY = Math.tan(fovY * 0.5);
        const tanHalfFovX = tanHalfFovY * (w / h);
        this.material.setProperty('uParams', new Vec4(near, far, 1.0 / w, 1.0 / h), 0);
        this.material.setProperty('uProj', new Vec4(tanHalfFovX, tanHalfFovY, 0.8, 0.1), 0);

        // Compute SSAO from depth
        const aoRT = super.slotName(camera, 0);
        ctx.clearBlack();
        ctx.addRenderPass('post-process', `SSAOCompute${cameraID}`)
            .setPassInput(inputDS, 'depthTex')
            .addRasterView(aoRT, gfx.Format.RGBA8)
            .blitScreen(0)
            .version();

        // Blend AO into color
        ctx.clearFlag = gfx.ClearFlagBit.NONE;
        ctx.addRenderPass('combine-pass', `SSAOCombine${cameraID}`)
            .setPassInput(aoRT, 'aoTex')
            .addRasterView(inputRT, gfx.Format.RGBA8)
            .blitScreen(1)
            .version();
    }

    get material (): Material {
        if (!this._material) {
            const mat = new Material();
            mat.initialize({ effectAsset: ssaoEffectAsset! });
            this._material = mat;
        }
        return this._material!;
    }
}

// Load SSAO effect and register the pass
function initCustomRendering (): void {
    if (ssaoEffectAsset) {
        registerPasses();
        return;
    }

    assetManager.loadAny({ uuid: SSAO_EFFECT_UUID, type: EffectAsset }, (err, effect) => {
        if (err || !effect) {
            console.error('CustomRendering: Failed to load SSAO effect:', err);
            return;
        }
        ssaoEffectAsset = effect;
        registerPasses();
    });
}

function registerPasses (): void {
    const builder = rendering.getCustomPipeline('Custom') as postProcess.PostProcessBuilder;
    if (!builder) {
        console.warn('CustomRendering: Custom pipeline builder not found, retrying...');
        setTimeout(registerPasses, 100);
        return;
    }

    // Insert SSAO after ForwardPass (before tonemap)
    builder.insertPass(new SSAOPass(), postProcess.ForwardPass);
    console.log('CustomRendering: SSAO pass registered');
}

// Initialize on script load
initCustomRendering();

@ccclass('CustomRendering')
export class CustomRendering extends Component { }
