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
            mat.setProperty('starBrightness', 1.2, 0);
            mat.setProperty('milkyWayIntensity', 0.8, 0);
            mat.setProperty('sunSize', 0.997, 0);
            mat.setProperty('skyExposure', 1.05, 0);
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

        // Multi-phase day cycle factors
        const dayFactor = smoothstep(-0.05, 0.25, sunHeight);
        const sunsetFactor = smoothstep(-0.03, 0.02, sunHeight) * (1.0 - smoothstep(0.02, 0.2, sunHeight));
        const goldenHour = smoothstep(0.0, 0.15, sunHeight) * (1.0 - smoothstep(0.15, 0.35, sunHeight));
        const nightFactor = 1.0 - dayFactor;
        const deepNight = smoothstep(0.0, -0.3, -sunHeight);

        // === LIGHT COLOR: rich warm golden → warm white → blue-white at midday ===
        // Midday: warm white (255, 248, 230)
        // Golden hour: warm orange (255, 180, 100)
        // Sunset: deep orange-red (255, 130, 60)
        // Night: cool blue moonlight (80, 110, 170)

        let lr = lerp(80, 255, dayFactor);
        let lg = lerp(110, 248, dayFactor);
        let lb = lerp(170, 230, dayFactor);

        lr = lerp(lr, 255, goldenHour * 0.3);
        lg = lerp(lg, 210, goldenHour * 0.3);
        lb = lerp(lb, 150, goldenHour * 0.3);

        lr = lerp(lr, 255, sunsetFactor * 0.6);
        lg = lerp(lg, 130, sunsetFactor * 0.6);
        lb = lerp(lb, 60, sunsetFactor * 0.6);

        this.sunLight.color = new Color(
            math.clamp(Math.floor(lr), 0, 255),
            math.clamp(Math.floor(lg), 0, 255),
            math.clamp(Math.floor(lb), 0, 255),
            255
        );

        // === LIGHT INTENSITY ===
        const baseIllum = lerp(800, 65000, dayFactor);
        const sunsetBoost = sunsetFactor * 8000;
        this.sunLight.illuminance = baseIllum + sunsetBoost;

        // === ENVIRONMENT ===
        const pipeline: any = (director.root as any)?.pipeline;
        const psd = pipeline?.pipelineSceneData;
        const ambient = psd?.ambient;
        if (ambient) {
            ambient.skyIllumHDR = lerp(1500, 28000, dayFactor);

            // Sky ambient color: warm at sunset, blue at midday, dark blue at night
            const skyR = lerp(0.02, 0.42, dayFactor);
            const skyG = lerp(0.03, 0.58, dayFactor);
            const skyB = lerp(0.08, 0.92, dayFactor);
            const skyWarmR = lerp(0.0, 0.65, sunsetFactor * 0.5);
            const skyWarmG = lerp(0.0, 0.35, sunsetFactor * 0.5);
            const skyWarmB = lerp(0.0, 0.12, sunsetFactor * 0.5);
            ambient.skyColorHDR = new Vec4(
                skyR + skyWarmR,
                skyG + skyWarmG,
                skyB + skyWarmB,
                lerp(0.05, 0.5, dayFactor)
            );

            ambient.groundAlbedoHDR = new Vec4(0.22, 0.19, 0.14, 1.0);
        }

        // === FOG: dynamic color matching sky horizon ===
        const fog = psd?.fog;
        if (fog) {
            // Base sky horizon colors per time of day
            // Day: soft blue (185, 205, 230)
            // Golden hour: warm haze (230, 180, 130)
            // Sunset: orange-red (240, 140, 80)
            // Night: deep blue (12, 18, 40)

            let fr = lerp(12, 185, dayFactor);
            let fg = lerp(18, 205, dayFactor);
            let fb = lerp(40, 230, dayFactor);

            // Golden hour warm tint
            fr = lerp(fr, 230, goldenHour * 0.4);
            fg = lerp(fg, 180, goldenHour * 0.4);
            fb = lerp(fb, 130, goldenHour * 0.4);

            // Sunset deep warm tint
            fr = lerp(fr, 240, sunsetFactor * 0.55);
            fg = lerp(fg, 140, sunsetFactor * 0.55);
            fb = lerp(fb, 80, sunsetFactor * 0.55);

            // Deep night cooling
            fr = lerp(fr, 5, deepNight * 0.4);
            fg = lerp(fg, 8, deepNight * 0.4);
            fb = lerp(fb, 20, deepNight * 0.4);

            fog.fogColor = new Color(
                math.clamp(Math.floor(fr), 0, 255),
                math.clamp(Math.floor(fg), 0, 255),
                math.clamp(Math.floor(fb), 0, 255),
                255
            );
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
