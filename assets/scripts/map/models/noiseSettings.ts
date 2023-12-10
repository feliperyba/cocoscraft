import { _decorator, CCFloat, CCInteger, Vec2 } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('NoiseSettings')
export class NoiseSettings {
    @property({ type: CCFloat })
    redistributionModifier = 0;

    @property({ type: CCFloat })
    noiseZoom = 0;

    @property({ type: CCFloat })
    persistance = 0;

    @property({ type: CCInteger })
    exponent = 0;

    @property({ type: CCInteger })
    octaves = 0;

    @property
    offset = new Vec2();

    @property
    worldOffset = new Vec2();
}
