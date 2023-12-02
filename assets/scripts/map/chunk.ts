import { _decorator, Vec3 } from 'cc';

import { ChunkData } from './chunkData';
import { MeshData } from './meshData';
import { BlockType } from './models/blocks';
const { ccclass } = _decorator;

@ccclass('Chunk')
export class Chunk {
    static getMeshData(chunkData: ChunkData): MeshData {
        const meshData = new MeshData(true);

        return { chunkData } as any as MeshData;
    }

    static loopThroughChunks(chunkData: ChunkData, cb: (x: number, y: number, z: number) => void): void {
        chunkData.blocks.forEach((c, index) => {
            const pos = this.getPositionFromIndex(index, chunkData);
            cb(pos.x, pos.y, pos.z);
        });
    }

    static getPositionFromIndex(index: number, chunkData: ChunkData): Vec3 {
        const x = index % chunkData.chunkSize;
        const y = Math.floor(index / chunkData.chunkSize) % chunkData.chunkHeight;
        const z = Math.floor(index / (chunkData.chunkSize * chunkData.chunkHeight));

        return new Vec3(x, y, z);
    }

    public static setBlock(chunkData: ChunkData, localPosition: Vec3, block: BlockType): void {
        if (
            this.inRange(chunkData, localPosition.x) &&
            this.inRangeHeight(chunkData, localPosition.y) &&
            this.inRange(chunkData, localPosition.z)
        ) {
            const index = this.getIndexFromPosition(chunkData, localPosition.x, localPosition.y, localPosition.z);
            chunkData.blocks[index] = block;

            return;
        }

        WorldDataHelper.setBlock(chunkData.worldNode, localPosition, block);
    }

    private static inRange(chunkData: ChunkData, x: number): boolean {
        if (x < 0 || x >= chunkData.chunkSize) {
            return false;
        }

        return true;
    }

    private static inRangeHeight(chunkData: ChunkData, y: number): boolean {
        if (y < 0 || y >= chunkData.chunkHeight) {
            return false;
        }

        return true;
    }

    private static getIndexFromPosition(chunkData: ChunkData, x: number, y: number, z: number): number {
        return x + chunkData.chunkSize * y + chunkData.chunkSize * chunkData.chunkHeight * z;
    }

    public static getBlockFromChunkCoordinates(
        chunkData: ChunkData,
        pos: { x: number; y: number; z: number }
    ): BlockType {
        const { x, y, z } = pos;

        if (this.inRange(chunkData, x) && this.inRangeHeight(chunkData, y) && this.inRange(chunkData, z)) {
            const index = this.getIndexFromPosition(chunkData, x, y, z);
            return chunkData.blocks[index];
        }

        return chunkData.worldNode.getBlockFromChunkCoordinates(
            chunkData,
            chunkData.worldPosition.x + x,
            chunkData.worldPosition.y + y,
            chunkData.worldPosition.z + z
        );
    }
}
