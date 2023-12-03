import { _decorator, Vec3 } from 'cc';

import { BlockType } from './models/blocks';
import { World } from './world';

const { ccclass } = _decorator;

@ccclass('ChunkData')
export class ChunkData {
    blocks: BlockType[] = [];
    chunkSize: number;
    chunkHeight: number;
    worldNode: World;
    worldPosition: Vec3;
    isModified = false;

    constructor(worldNode: World, worldPosition: Vec3, chunkSize: number, chunkHeight: number) {
        this.chunkSize = chunkSize;
        this.chunkHeight = chunkHeight;
        this.worldNode = worldNode;
        this.worldPosition = worldPosition;
    }

    onLoad(): void {
        this.blocks = new Array<BlockType>(this.chunkSize * this.chunkSize * this.chunkHeight);
    }
}
