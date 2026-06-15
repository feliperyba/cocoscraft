import { _decorator, Component, MeshRenderer, Mesh, Node, Material, primitives, utils, Vec4, Camera, director, Layers, Vec3, DirectionalLight, Color, math, assetManager, EffectAsset } from 'cc';

const { ccclass, property } = _decorator;

const SKY_EFFECT_UUID = 'b8f4a102-0002-4b02-c002-b1b1b0000002';

@ccclass('DayNightCycle')
export class DayNightCycle extends Component {
    @property(DirectionalLight)
    sunLight: DirectionalLight | null = null;

    @property(Camera)
    mainCamera: Camera | null = null;

    @property
    dayDuration: number = 180;

    @property
    startTime: number = 0.3;

    private _time: number = 0;
    private _skyNode: Node | null = null;
    private _skyMaterial: Material | null = null;
    private _sunDir: Vec3 = new Vec3(0, 1, 0);

    onLoad(): void {
        this._time = this.startTime;

        if (!this.sunLight) {
            const lightNode = director.getScene()?.getChildByName('Directional Light');
            this.sunLight = lightNode?.getComponent(DirectionalLight) ?? null;
        }
        if (!this.mainCamera) {
            this.mainCamera = this.node.scene?.getChildByName('Main Camera')?.getComponent(Camera) ?? null;
        }

        this.createSkyDome();
    }

    private createSkyDome(): void {
        const node = new Node('SkyDome');
        const renderer = node.addComponent(MeshRenderer);

        const sphereMesh = utils.MeshUtils.createMesh(primitives.sphere(500));
        renderer.mesh = sphereMesh;
        node.layer = Layers.Enum.DEFAULT;
        director.getScene()?.addChild(node);
        this._skyNode = node;

        assetManager.loadAny({ uuid: SKY_EFFECT_UUID, type: EffectAsset }, (err, effect) => {
            if (err || !effect) {
                console.error('DayNightCycle: Failed to load sky effect:', err);
                return;
            }
            const mat = new Material();
            mat.initialize({ effectAsset: effect });
            mat.setProperty('starBrightness', 1.0, 0);
            mat.setProperty('milkyWayIntensity', 0.6, 0);
            mat.setProperty('sunSize', 0.997, 0);
            mat.setProperty('skyExposure', 1.0, 0);
            renderer.setMaterial(mat, 0);
            this._skyMaterial = mat;
            this.updateSkyUniforms();
        });
    }

    update(dt: number): void {
        this._time += dt / this.dayDuration;
        if (this._time >= 1.0) this._time -= 1.0;

        this.updateSun();
        this.updateLighting();
        this.updateSkyUniforms();
    }

    private updateSun(): void {
        const angle = (this._time - 0.25) * Math.PI * 2;
        const elevation = Math.sin(angle);

        this._sunDir.set(
            Math.cos(angle) * 0.7,
            elevation,
            Math.cos(angle) * 0.3 + 0.2
        );
        this._sunDir.normalize();

        if (this.sunLight) {
            const lightNode = this.sunLight.node;
            const pitchDeg = math.toDegree(Math.asin(this._sunDir.y));
            const yawDeg = math.toDegree(Math.atan2(this._sunDir.x, this._sunDir.z));
            lightNode.setRotationFromEuler(-pitchDeg, yawDeg, 0);
        }
    }

    private updateLighting(): void {
        if (!this.sunLight) return;

        const sunHeight = this._sunDir.y;
        const dayFactor = smoothstep(-0.1, 0.3, sunHeight);
        const sunsetFactor = smoothstep(-0.05, 0.05, sunHeight) * (1.0 - smoothstep(0.05, 0.3, sunHeight));
        const nightFactor = 1.0 - dayFactor;

        // Light color: day → sunset → night
        let lr = lerp(60, 255, dayFactor);
        let lg = lerp(70, 240, dayFactor);
        let lb = lerp(120, 210, dayFactor);
        lr = lerp(lr, 255, sunsetFactor * 0.5);
        lg = lerp(lg, 140, sunsetFactor * 0.5);
        lb = lerp(lb, 70, sunsetFactor * 0.5);
        this.sunLight.color = new Color(
            math.clamp(Math.floor(lr), 0, 255),
            math.clamp(Math.floor(lg), 0, 255),
            math.clamp(Math.floor(lb), 0, 255),
            255
        );

        // Light intensity: bright day, dim night
        this.sunLight.illuminance = lerp(2000, 55000, dayFactor);

        // Ambient: bright day, very dim night
        const root: any = director.root;
        const ambient = root?.pipelineSceneData?.ambient;
        if (ambient) {
            ambient.skyIllumHDR = lerp(2000, 25000, dayFactor);
            const skyR = lerp(0.03, 0.5, dayFactor);
            const skyG = lerp(0.04, 0.65, dayFactor);
            const skyB = lerp(0.08, 0.9, dayFactor);
            ambient.skyColorHDR = new Vec4(skyR, skyG, skyB, lerp(0.05, 0.5, dayFactor));
        }
    }

    private updateSkyUniforms(): void {
        if (!this._skyMaterial) return;
        this._skyMaterial.setProperty('sunDir', new Vec4(this._sunDir.x, this._sunDir.y, this._sunDir.z, this._time), 0);
    }

    get timeOfDay(): number { return this._time; }
    set timeOfDay(value: number) { this._time = value; }
}

function smoothstep(edge0: number, edge1: number, x: number): number {
    const t = math.clamp01((x - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}
