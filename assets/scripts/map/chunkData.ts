import { _decorator, Vec3 } from 'cc';

import { BlockType } from './models/blocks';
import { World } from './world';
const { ccclass, type, property } = _decorator;

@ccclass('ChunkData')
export class ChunkData {
    @type([BlockType])
    blocks: BlockType[] = [];

    @property
    chunkSize = 16;

    @property
    chunkHeight = 100;

    @type(World)
    worldNode: World;

    @type(Vec3)
    worldPosition: Vec3;

    isModified = false;

    constructor(worldNode: World, worldPosition: Vec3) {
        this.worldNode = worldNode;
        this.worldPosition = worldPosition;
    }

    onLoad(): void {
        this.blocks = new Array<BlockType>(this.chunkSize * this.chunkSize * this.chunkHeight);
    }
}
