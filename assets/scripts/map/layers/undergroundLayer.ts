import { _decorator, Enum, Vec3 } from 'cc';

import { Chunk } from '../chunk';
import { BlockType } from '../models';
import { LayerHandler, LayerParams } from './layerHandler';
const { ccclass, type, property } = _decorator;

@ccclass('UndergroundLayer')
export class UndergroundLayer extends LayerHandler {
    @property({ type: LayerHandler, override: true })
    override nextHandler?: LayerHandler;

    @type(Enum(BlockType))
    undergroundBlockType!: BlockType;

    tryHandling(params: LayerParams): boolean {
        const { chunkData, x, y, z, surfaceHeightNoise } = params;

        if (y < surfaceHeightNoise) {
            const pos = new Vec3(x, y, z);
            Chunk.setBlock(chunkData, pos, this.undergroundBlockType);

            return true;
        }
        return false;
    }
}
