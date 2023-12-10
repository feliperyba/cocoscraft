import { _decorator, CCInteger, Vec2 } from 'cc';

import { NoiseSettings } from './models/noiseSettings';
import { octavePerlin } from './utils/sunnyNoise';

const { ccclass, property, type } = _decorator;

@ccclass('DomainWarping')
export class DomainWarping {
    @type(NoiseSettings)
    noiseDomainX = new NoiseSettings();

    @type(NoiseSettings)
    noiseDomainY = new NoiseSettings();

    @property({ type: CCInteger })
    amplitudeX: number = 50;

    @property({ type: CCInteger })
    amplitudeY: number = 50;

    generateDomainNoise(x: number, z: number, defaultNoiseSettings: NoiseSettings): number {
        const domainOffset = this.generateDomainOffset(x, z);
        return octavePerlin(x + domainOffset.x, z + domainOffset.y, defaultNoiseSettings);
    }

    generateDomainOffset(x: number, z: number): Vec2 {
        const noiseX = octavePerlin(x, z, this.noiseDomainX) * this.amplitudeX;
        const noiseY = octavePerlin(x, z, this.noiseDomainY) * this.amplitudeY;

        return new Vec2(noiseX, noiseY);
    }

    generateDomainOffsetInt(x: number, z: number): Vec2 {
        const offset = this.generateDomainOffset(x, z);
        return new Vec2(Math.round(offset.x), Math.round(offset.y));
    }
}
