import { _decorator, Vec3 } from 'cc';

import { Chunk } from '../chunk';
import { BlockType } from '../models';
import { LayerHandler, LayerParams } from './layerHandler';
const { ccclass, property } = _decorator;

@ccclass('AirLayer')
export class AirLayer extends LayerHandler {
    @property({ type: LayerHandler, override: true })
    override nextHandler?: LayerHandler;

    tryHandling(params: LayerParams): boolean {
        const { chunkData, x, y, z, surfaceHeightNoise } = params;

        if (y > surfaceHeightNoise) {
            const pos = new Vec3(x, y, z);
            Chunk.setBlock(chunkData, pos, BlockType.Air);

            return true;
        }
        return false;
    }
}
