import { _decorator, Component, instantiate, Prefab, Vec2, Vec3 } from 'cc';

import { Chunk } from './chunk';
import { ChunkData } from './chunkData';
import { ChunkRenderer } from './chunkRenderer';
import { BlockType } from './models';
import { TerrainGenerator } from './terrainGenerator';
const { ccclass, property, type } = _decorator;

@ccclass('World')
export class World extends Component {
    @type(TerrainGenerator)
    terrainGenerator!: TerrainGenerator;

    @property
    seedOffSet = new Vec2();

    @property
    mapSizeInChunks!: number;

    @property
    chunkSize!: number;

    @property
    chunkHeight!: number;

    @property(Prefab)
    chunkPrefab!: Prefab;

    chunkDataDictionary: Map<Vec3, ChunkData> = new Map<Vec3, ChunkData>();
    chunkDictionary: Map<Vec3, ChunkRenderer> = new Map<Vec3, ChunkRenderer>();

    generateWorld(): void {
        this.cleanUpWorldData();

        for (let x = 0; x < this.mapSizeInChunks; x++) {
            for (let z = 0; z < this.mapSizeInChunks; z++) {
                const data = new ChunkData(
                    this,
                    new Vec3(x * this.chunkSize, 0, z * this.chunkSize),
                    this.chunkSize,
                    this.chunkHeight
                );

                const terrainData = this.terrainGenerator.generateChunkData(data, this.seedOffSet);
                this.chunkDataDictionary.set(data.worldPosition, terrainData);
            }
        }

        for (const data of this.chunkDataDictionary.values()) {
            const meshData = Chunk.getMeshData(data);
            const chunkObject = instantiate(this.chunkPrefab);

            chunkObject.setPosition(data.worldPosition);

            const chunkRenderer = chunkObject.getComponent(ChunkRenderer)!;
            this.chunkDictionary.set(data.worldPosition, chunkRenderer);

            chunkRenderer.initChunk(data);
            chunkRenderer.updateChunkWithData(meshData);

            this.node.addChild(chunkObject);
        }
    }

    getBlockFromChunkCoordinates(x: number, y: number, z: number): BlockType {
        const pos: Vec3 = Chunk.chunkPositionFromBlockCoords(this, x, y, z);
        const containerChunk: ChunkData | undefined = this.chunkDataDictionary.get(pos);

        if (containerChunk === undefined) {
            return BlockType.Empty;
        }

        const blockInChunkCoordinates: Vec3 = Chunk.getBlockInChunkCoordinates(containerChunk, new Vec3(x, y, z));
        return Chunk.getBlockFromChunkCoordinatesVec3(containerChunk, blockInChunkCoordinates);
    }

    private cleanUpWorldData(): void {
        this.chunkDataDictionary.clear();
        for (const chunk of this.chunkDictionary.values()) {
            chunk.node.destroy();
        }
        this.chunkDictionary.clear();
    }
}
