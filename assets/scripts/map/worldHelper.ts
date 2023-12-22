import { Vec3 } from 'cc';

import { WorldData, WorldGenerationData } from './models';
import { parseVec3ToInt } from './utils';
import { World } from './world';

export default class WorldHelper {
    static getVisiblePositions(fromPosition: Vec3, worldRef: World, worldData: WorldData): WorldGenerationData {
        const allChunkPositionsNeeded: Vec3[] = this.getChunkPositionsAroundPlayer(worldRef, fromPosition);
        const allChunkDataPositionsNeeded: Vec3[] = this.getDataPositionsAroundPlayer(worldRef, fromPosition);

        const chunkPositionsToCreate: Vec3[] = this.selectPositonsToCreate(
            worldData,
            allChunkPositionsNeeded,
            fromPosition
        );
        const chunkDataPositionsToCreate: Vec3[] = this.selectDataPositonsToCreate(
            worldData,
            allChunkDataPositionsNeeded,
            fromPosition
        );

        const chunkPositionsToRemove: number[] = this.getUnnededChunks(worldData, allChunkPositionsNeeded);
        const chunkDataPositionsToRemove: number[] = this.getUnnededData(worldData, allChunkDataPositionsNeeded);

        return {
            chunkPositionsToCreate,
            chunkDataPositionsToCreate,
            chunkPositionsToRemove,
            chunkDataPositionsToRemove,
        };
    }

    static getChunkPositionsAroundPlayer(worldRef: World, fromPosition: Vec3): Vec3[] {
        return this.getPositionsAroundPlayer(worldRef, fromPosition, worldRef.chunkDrawingRange);
    }

    // We want to know a bit upfront the data of the next chunk before the drwaing range
    // so we can save a bit of the performance on the data generation
    static getDataPositionsAroundPlayer(worldRef: World, fromPosition: Vec3): Vec3[] {
        return this.getPositionsAroundPlayer(worldRef, fromPosition, worldRef.chunkDrawingRange + 1);
    }

    private static getPositionsAroundPlayer(worldRef: World, fromPosition: Vec3, drawingRange: number): Vec3[] {
        const chunkPositionsToCreate: Vec3[] = [];

        const startX = fromPosition.x - drawingRange * worldRef.chunkSize;
        const startZ = fromPosition.z - drawingRange * worldRef.chunkSize;
        const endX = fromPosition.x + drawingRange * worldRef.chunkSize;
        const endZ = fromPosition.z + drawingRange * worldRef.chunkSize;

        for (let x = startX; x <= endX; x += worldRef.chunkSize) {
            for (let z = startZ; z <= endZ; z += worldRef.chunkSize) {
                const chunkPos: Vec3 = this.chunkPositionFromBlockCoords(worldRef, new Vec3(x, 0, z));
                chunkPositionsToCreate.push(chunkPos);

                // We want to also create the underground chunks, so when we dig they are already there
                /*if (
                    x >= fromPosition.x - world.chunkSize &&
                    x <= fromPosition.x + world.chunkSize &&
                    z >= fromPosition.z - world.chunkSize &&
                    z <= fromPosition.z + world.chunkSize
                ) {
                    for (
                        let y = -world.chunkHeight;
                        y >= fromPosition.y - world.chunkHeight * 2;
                        y -= world.chunkHeight
                    ) {
                        chunkPos = this.chunkPositionFromBlockCoords(world, new Vec3(x, y, z));
                        chunkPositionsToCreate.push(chunkPos);
                    }
                }*/
            }
        }

        return chunkPositionsToCreate;
    }

    static selectPositonsToCreate(worldData: WorldData, allChunkPositionsNeeded: Vec3[], fromPosition: Vec3): Vec3[] {
        return allChunkPositionsNeeded
            .filter(pos => !worldData.chunkDictionary.has(parseVec3ToInt(pos)))
            .sort((a, b) => Vec3.distance(fromPosition, a) - Vec3.distance(fromPosition, b));
    }

    static selectDataPositonsToCreate(
        worldData: WorldData,
        allChunkDataPositionsNeeded: Vec3[],
        fromPosition: Vec3
    ): Vec3[] {
        return allChunkDataPositionsNeeded
            .filter(pos => !worldData.chunkDataDictionary.has(parseVec3ToInt(pos)))
            .sort((a, b) => Vec3.distance(fromPosition, a) - Vec3.distance(fromPosition, b));
    }

    static getUnnededChunks(worldData: WorldData, allChunkPositionsNeeded: Vec3[]): number[] {
        const positionsToRemove: number[] = [];

        Array.from(worldData.chunkDictionary.keys())
            .filter(pos => !allChunkPositionsNeeded.some(neededPos => parseVec3ToInt(neededPos) === pos))
            .forEach(pos => {
                if (worldData.chunkDictionary.has(pos)) {
                    positionsToRemove.push(pos);
                }
            });

        return positionsToRemove;
    }

    static getUnnededData(worldData: WorldData, allChunkDataPositionsNeeded: Vec3[]): number[] {
        return Array.from(worldData.chunkDataDictionary.keys()).filter(
            pos =>
                !allChunkDataPositionsNeeded.some(neededPos => parseVec3ToInt(neededPos) === pos) &&
                !worldData.chunkDataDictionary.get(pos)!.isModified
        );
    }

    static removeChunkData(worldRef: World, pos: number): void {
        worldRef.worldData.chunkDataDictionary.delete(pos);
    }

    static removeChunk(worldRef: World, pos: number): void {
        const chunk = worldRef.worldData.chunkDictionary.get(pos);
        if (!chunk) return;

        chunk.node.active = false;
        worldRef.worldData.chunkDictionary.delete(pos);
        chunk.node.destroy();
    }

    static chunkPositionFromBlockCoords(worldRef: World, position: Vec3): Vec3 {
        return new Vec3(
            Math.floor(position.x / worldRef.chunkSize) * worldRef.chunkSize,
            Math.floor(position.y / worldRef.chunkHeight) * worldRef.chunkHeight,
            Math.floor(position.z / worldRef.chunkSize) * worldRef.chunkSize
        );
    }
}
