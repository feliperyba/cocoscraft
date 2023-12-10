import { _decorator, CCFloat, Enum, Vec3 } from 'cc';

import { Chunk } from '../chunk';
import { DomainWarping } from '../domainWarping';
import { BlockType } from '../models';
import { NoiseSettings } from '../models/noiseSettings';
import { LayerHandler, LayerParams } from './layerHandler';

const { ccclass, property, type } = _decorator;

@ccclass('StoneLayer')
export class StoneLayer extends LayerHandler {
    @property({ type: LayerHandler, override: true })
    override nextHandler?: LayerHandler;

    @type(Enum(BlockType))
    surfaceBlockType!: BlockType;

    @property({ type: CCFloat, range: [0, 1] })
    stoneThreshold: number = 0.5;

    @type(NoiseSettings)
    stoneNoiseSettings: NoiseSettings = new NoiseSettings();

    @type(DomainWarping)
    domainWarping: DomainWarping = new DomainWarping();

    tryHandling(params: LayerParams): boolean {
        const { chunkData, x, z, surfaceHeightNoise, mapSeedOffset } = params;

        if (chunkData.worldPosition.y > surfaceHeightNoise) return false;

        this.stoneNoiseSettings.worldOffset = mapSeedOffset;

        const stoneNoise = this.domainWarping.generateDomainNoise(
            chunkData.worldPosition.x + x,
            chunkData.worldPosition.z + z,
            this.stoneNoiseSettings
        );

        let endPosition = surfaceHeightNoise;
        if (chunkData.worldPosition.y < 0) {
            endPosition = chunkData.worldPosition.y + chunkData.chunkHeight;
        }

        if (stoneNoise > this.stoneThreshold) {
            for (let i = chunkData.worldPosition.y; i <= endPosition; i++) {
                const pos = new Vec3(x, i, z);
                Chunk.setBlock(chunkData, pos, this.surfaceBlockType);
            }

            return true;
        }
        return false;
    }
}
