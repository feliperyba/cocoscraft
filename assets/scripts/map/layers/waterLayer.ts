import { _decorator, CCInteger, Vec3 } from 'cc';

import { Chunk } from '../chunk';
import { BlockType } from '../models';
import { LayerHandler, LayerParams } from './layerHandler';
const { ccclass, property } = _decorator;

@ccclass('WaterLayer')
export class WaterLayer extends LayerHandler {
    @property({ type: LayerHandler, override: true })
    override nextHandler?: LayerHandler;

    @property({ type: CCInteger })
    waterLevel: number = 1;

    tryHandling(params: LayerParams): boolean {
        const { chunkData, x, y, z, surfaceHeightNoise } = params;

        if (y > surfaceHeightNoise && y <= this.waterLevel) {
            const pos = new Vec3(x, y, z);
            Chunk.setBlock(chunkData, pos, BlockType.Water);

            if (y == surfaceHeightNoise + 1) {
                pos.y = surfaceHeightNoise;
                Chunk.setBlock(chunkData, pos, BlockType.Sand);
            }

            return true;
        }
        return false;
    }
}
