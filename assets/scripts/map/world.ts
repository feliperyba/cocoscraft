import { _decorator, Component, instantiate, Node, Prefab, Quat, Vec2, Vec3 } from 'cc';

import { BlockHelper } from './blockHelper';
import { Chunk } from './chunk';
import { ChunkData } from './chunkData';
import { ChunkRenderer } from './chunkRenderer';
import { BlockType, WorldData } from './models';
import { TerrainGenerator } from './terrainGenerator';
import { parseVec3ToInt } from './utils';
import WorldHelper from './worldHelper';
const { ccclass, property, type } = _decorator;

@ccclass('World')
export class World extends Component {
    @type(TerrainGenerator)
    terrainGenerator!: TerrainGenerator;

    @property
    chunkDrawingRange!: number;

    @property
    seedOffSet = new Vec2();

    @property
    chunkSize!: number;

    @property
    chunkHeight!: number;

    @property(Prefab)
    chunkPrefab!: Prefab;

    worldData = new WorldData();

    protected onLoad(): void {
        this.worldData.chunkSize = this.chunkSize;
        this.worldData.chunkHeight = this.chunkHeight;
    }

    // TODO: There is a strange behaviour that happens when we attach such methods to Button events
    // it will forward the event as a parameter, dont matter the signature of the method
    generateWorld(touch?: any, position?: Vec3, cleanUp = true): void {
        if (cleanUp) this.cleanUpWorldData();

        const startPos = position ?? new Vec3(0, 0, 0);
        const worldGenerationData = WorldHelper.getVisiblePositions(startPos, this, this.worldData);

        for (const pos of worldGenerationData.chunkPositionsToRemove) {
            WorldHelper.removeChunk(this, pos);
        }

        for (const pos of worldGenerationData.chunkDataPositionsToRemove) {
            WorldHelper.removeChunkData(this, pos);
        }

        for (const pos of worldGenerationData.chunkDataPositionsToCreate) {
            const data = new ChunkData(this, pos, this.chunkSize, this.chunkHeight);
            const terrainData = this.terrainGenerator.generateChunkData(data, this.seedOffSet);

            this.worldData.chunkDataDictionary.set(parseVec3ToInt(pos), terrainData);
        }

        for (const pos of worldGenerationData.chunkPositionsToCreate) {
            const data = this.worldData.chunkDataDictionary.get(parseVec3ToInt(pos));

            if (!data) {
                console.error('Chunk data not found', pos);
                continue;
            }

            const meshData = Chunk.getMeshData(data, BlockHelper);
            const chunkObject = instantiate(this.chunkPrefab);

            chunkObject.setPosition(data.worldPosition);
            chunkObject.setRotation(Quat.IDENTITY);

            const chunkRenderer = chunkObject.getComponent(ChunkRenderer)!;
            this.worldData.chunkDictionary.set(parseVec3ToInt(data.worldPosition), chunkRenderer);

            chunkRenderer.initChunk(data);
            chunkRenderer.updateChunkWithData(meshData);

            this.node.addChild(chunkObject);
        }
    }

    getBlockFromChunkCoordinates(x: number, y: number, z: number): BlockType {
        const pos: Vec3 = Chunk.chunkPositionFromBlockCoords(this, x, y, z);
        const containerChunk: ChunkData | undefined = this.worldData.chunkDataDictionary.get(parseVec3ToInt(pos));

        if (containerChunk === undefined) {
            return BlockType.Empty;
        }

        const blockInChunkCoordinates: Vec3 = Chunk.getBlockInChunkCoordinates(containerChunk, new Vec3(x, y, z));
        return Chunk.getBlockFromChunkCoordinatesVec3(containerChunk, blockInChunkCoordinates);
    }

    loadAdditionalChunksRequest(playerInstance: Node): void {
        const roundedPos = new Vec3(
            Math.round(playerInstance.position.x),
            Math.round(playerInstance.position.y),
            Math.round(playerInstance.position.z)
        );

        this.generateWorld(undefined, roundedPos, false);
    }

    private cleanUpWorldData(): void {
        this.worldData.chunkDataDictionary.clear();

        for (const chunk of this.worldData.chunkDictionary.values()) {
            chunk.node.destroy();
        }

        this.worldData.chunkDictionary.clear();
    }
}
