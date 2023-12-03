import { _decorator, Vec3 } from 'cc';

import { BlockHelper } from './blockHelper';
import { ChunkData } from './chunkData';
import { MeshData } from './meshData';
import { BlockType } from './models';
import { World } from './world';

const { ccclass } = _decorator;

@ccclass('Chunk')
export class Chunk {
    static getMeshData(chunkData: ChunkData): MeshData {
        let meshData = new MeshData(true);

        this.loopThroughChunks(
            chunkData,
            (x, y, z) =>
                (meshData = BlockHelper.getMeshData(
                    chunkData,
                    x,
                    y,
                    z,
                    meshData,
                    chunkData.blocks[this.getIndexFromPosition(chunkData, x, y, z)]
                ))
        );

        return meshData;
    }

    static loopThroughChunks(chunkData: ChunkData, cb: (x: number, y: number, z: number) => void): void {
        for (let index = 0; index < chunkData.blocks.length; index++) {
            const pos = this.getPositionFromIndex(index, chunkData);
            cb(pos.x, pos.y, pos.z);
        }
    }

    static getPositionFromIndex(index: number, chunkData: ChunkData): Vec3 {
        const x = index % chunkData.chunkSize;
        const y = Math.floor(index / chunkData.chunkSize) % chunkData.chunkHeight;
        const z = Math.floor(index / (chunkData.chunkSize * chunkData.chunkHeight));

        return new Vec3(x, y, z);
    }

    static setBlock(chunkData: ChunkData, localPosition: Vec3, block: BlockType): void {
        if (
            this.inRange(chunkData, localPosition.x) &&
            this.inRangeHeight(chunkData, localPosition.y) &&
            this.inRange(chunkData, localPosition.z)
        ) {
            const index = this.getIndexFromPosition(chunkData, localPosition.x, localPosition.y, localPosition.z);
            chunkData.blocks[index] = block;
        } else {
            throw new Error('Need to ask World for appropriate chunk');
        }
    }

    static getBlockFromChunkCoordinatesVec3(chunkData: ChunkData, pos: Vec3): BlockType {
        return this.getBlockFromChunkCoordinates(chunkData, pos.x, pos.y, pos.z);
    }

    static getBlockFromChunkCoordinates(chunkData: ChunkData, x: number, y: number, z: number): BlockType {
        if (this.inRange(chunkData, x) && this.inRangeHeight(chunkData, y) && this.inRange(chunkData, z)) {
            const index = this.getIndexFromPosition(chunkData, x, y, z);
            return chunkData.blocks[index];
        }

        return chunkData.worldNode.getBlockFromChunkCoordinates(
            chunkData.worldPosition.x + x,
            chunkData.worldPosition.y + y,
            chunkData.worldPosition.z + z
        );
    }

    static getBlockInChunkCoordinates(chunkData: ChunkData, pos: Vec3): Vec3 {
        return new Vec3(
            pos.x - chunkData.worldPosition.x,
            pos.y - chunkData.worldPosition.y,
            pos.z - chunkData.worldPosition.z
        );
    }

    static chunkPositionFromBlockCoords(world: World, x: number, y: number, z: number): Vec3 {
        const pos = new Vec3(
            Math.floor(x / world.chunkSize) * world.chunkSize,
            Math.floor(y / world.chunkHeight) * world.chunkHeight,
            Math.floor(z / world.chunkSize) * world.chunkSize
        );

        return pos;
    }

    private static inRange(chunkData: ChunkData, axisCoordinate: number): boolean {
        return axisCoordinate >= 0 && axisCoordinate < chunkData.chunkSize;
    }

    private static inRangeHeight(chunkData: ChunkData, yCoordinate: number): boolean {
        return yCoordinate >= 0 && yCoordinate < chunkData.chunkHeight;
    }

    private static getIndexFromPosition(chunkData: ChunkData, x: number, y: number, z: number): number {
        return x + chunkData.chunkSize * y + chunkData.chunkSize * chunkData.chunkHeight * z;
    }
}
