/* eslint-disable @typescript-eslint/naming-convention */
import { beeThreads } from 'bee-threads';
import { _decorator, Component, instantiate, Node, Prefab, Quat, Vec2, Vec3 } from 'cc';

import { BlockDataManager } from './blockDataManager';
import { BlockHelper } from './blockHelper';
import { Chunk } from './chunk';
import { ChunkData } from './chunkData';
import { ChunkRenderer } from './chunkRenderer';
import { ChunkBatchGroup, MeshBatcher } from './meshBatcher';
import { WorldData } from './models';
import { generateChunkMeshPure, MeshGenerationConfig, PureMeshData } from './pure/pureMesh';
import * as PureNoise from './pure/pureNoise';
import * as PureTerrain from './pure/pureTerrain';
import { TerrainGenerator } from './terrainGenerator';
import { parseVec3ToInt } from './utils';
import { applyChunkData, createBlockDefinitions, createChunkConfig } from './workerAdapter';
import WorldHelper from './worldHelper';

// Declare context variable injected by bee-threads for mesh generation worker
declare const pn_generateChunkMeshPure_src: string;

/**
 * Runs in worker thread, reconstructs generateChunkMeshPure from injected source.
 */
const meshGenerationWorker = (config: MeshGenerationConfig): PureMeshData => {
    const g = globalThis as any;
    if (!g.generateChunkMeshPure) {
        g.generateChunkMeshPure = new Function('return ' + pn_generateChunkMeshPure_src)();
    }
    return g.generateChunkMeshPure(config);
};

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    blockDefinitions: Record<number, any> = {};

    private meshCreationQueue: { chunkData: ChunkData; meshData: PureMeshData | null }[] = [];
    private generatedMeshes = new Map<number, PureMeshData>();
    private meshCache = new Map<number, { mesh: PureMeshData; blockHash: number }>();
    private batchGroups = new Map<number, ChunkBatchGroup>();
    private chunkToBatch = new Map<number, number>();
    private nextBatchId = 0;
    private readonly chunksPerBatch = 4;
    private isGenerating = false;

    protected onLoad(): void {
        this.worldData.chunkSize = this.chunkSize;
        this.worldData.chunkHeight = this.chunkHeight;
    }

    protected update(): void {
        this.processMeshQueue();
        this.processMeshUpdateQueue();
    }

    private readonly batchMultiplier = 2;

    private processMeshQueue(): void {
        if (this.meshCreationQueue.length === 0) return;

        const chunksToProcess = this.collectChunksForProcessing();
        if (chunksToProcess.length === 0) return;

        for (let i = 0; i < chunksToProcess.length; i += this.chunksPerBatch) {
            const batchChunks = chunksToProcess.slice(i, i + this.chunksPerBatch);
            this.createBatchedMesh(batchChunks);
        }
    }

    private collectChunksForProcessing(): { chunkData: ChunkData; meshData: PureMeshData }[] {
        const maxChunksPerFrame = this.chunksPerBatch * this.batchMultiplier;
        const chunksToProcess: { chunkData: ChunkData; meshData: PureMeshData }[] = [];

        while (this.meshCreationQueue.length > 0 && chunksToProcess.length < maxChunksPerFrame) {
            const task = this.meshCreationQueue.shift();
            if (!task) continue;

            const { chunkData, meshData } = task;

            if (!chunkData.isModified) continue;
            if (this.worldData.chunkDictionary.has(parseVec3ToInt(chunkData.worldPosition))) continue;

            const finalMeshData = meshData ?? this.generateMeshFallback(chunkData);
            if (!finalMeshData) continue;

            chunksToProcess.push({ chunkData, meshData: finalMeshData });
        }

        return chunksToProcess;
    }

    /**
     * Generate mesh on main thread as fallback.
     */
    private generateMeshFallback(chunkData: ChunkData): PureMeshData | null {
        try {
            const meshData = Chunk.getMeshData(chunkData, BlockHelper);
            return {
                vertices: meshData.vertices.flatMap(v => [v.x, v.y, v.z]),
                indices: meshData.triangles,
                uvs: meshData.uv.flatMap(uv => [uv.x, uv.y]),
                normals: [],
                collisionVertices: meshData.collisionVertices.flatMap(v => [v.x, v.y, v.z]),
                collisionIndices: meshData.collisionTriangles,
                waterMesh: meshData.waterMesh
                    ? {
                          vertices: meshData.waterMesh.vertices.flatMap(v => [v.x, v.y, v.z]),
                          indices: meshData.waterMesh.triangles,
                          uvs: meshData.waterMesh.uv.flatMap(uv => [uv.x, uv.y]),
                          normals: [],
                          collisionVertices: [],
                          collisionIndices: [],
                      }
                    : undefined,
            };
        } catch (e) {
            console.error('Failed to generate fallback mesh:', e);
            return null;
        }
    }

    /**
     * Create a batched mesh from multiple chunks.
     */
    private createBatchedMesh(chunks: { chunkData: ChunkData; meshData: PureMeshData }[]): void {
        if (chunks.length === 0) return;

        const origin = chunks[0].chunkData.worldPosition;
        const batchId = this.nextBatchId++;

        const meshesToBatch = chunks.map(({ chunkData, meshData }) => ({
            mesh: meshData,
            offsetX: chunkData.worldPosition.x,
            offsetY: chunkData.worldPosition.y,
            offsetZ: chunkData.worldPosition.z,
        }));

        const batches = MeshBatcher.batchMeshes(meshesToBatch);
        if (batches.length === 0) return;

        const batchedMesh = batches[0];

        const batchNode = new Node(`Batch_${batchId}`);
        batchNode.setPosition(0, 0, 0);
        batchNode.setRotation(Quat.IDENTITY);

        for (const { chunkData, meshData } of chunks) {
            const chunkObject = instantiate(this.chunkPrefab);
            chunkObject.setPosition(chunkData.worldPosition);
            chunkObject.setRotation(Quat.IDENTITY);

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const chunkRenderer = chunkObject.getComponent(ChunkRenderer)!;
            this.worldData.chunkDictionary.set(parseVec3ToInt(chunkData.worldPosition), chunkRenderer);

            chunkRenderer.initChunk(chunkData);
            chunkRenderer.updateChunkWithPureData(meshData);

            this.node.addChild(chunkObject);
            this.chunkToBatch.set(parseVec3ToInt(chunkData.worldPosition), batchId);
        }

        const batchGroup: ChunkBatchGroup = {
            batchId,
            originX: origin.x,
            originY: origin.y,
            originZ: origin.z,
            chunkPositions: chunks.map(c => parseVec3ToInt(c.chunkData.worldPosition)),
            batchedMesh,
            batchNode,
            isDirty: false,
        };
        this.batchGroups.set(batchId, batchGroup);

        // Note: For full batching benefit, you would:
        // 1. Add a MeshRenderer component to batchNode
        // 2. Apply batchedMesh to it
        // 3. Disable individual chunk mesh renderers
        // This requires adding MeshRenderer to batchNode dynamically
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, complexity
    async generateWorld(touch?: any, position?: Vec3, cleanUp = true): Promise<void> {
        if (!this.worldData) this.worldData = new WorldData();
        if (cleanUp) this.cleanUpWorldData();
        this.blockDefinitions = createBlockDefinitions();

        const startPos = position ?? new Vec3(0, 0, 0);
        const worldGenerationData = WorldHelper.getVisiblePositions(startPos, this, this.worldData);

        for (const pos of worldGenerationData.chunkPositionsToRemove) {
            WorldHelper.removeChunk(this, pos);
        }

        for (const pos of worldGenerationData.chunkDataPositionsToRemove) {
            WorldHelper.removeChunkData(this, pos);
        }

        const chunkConfigs: PureTerrain.ChunkGenerationConfig[] = [];
        const newChunksData: ChunkData[] = [];

        for (const pos of worldGenerationData.chunkDataPositionsToCreate) {
            const data = new ChunkData(this, pos, this.chunkSize, this.chunkHeight);

            const config = createChunkConfig(
                data,
                this.terrainGenerator.biomeGenerator,
                this.seedOffSet,
                this.blockDefinitions
            );

            chunkConfigs.push(config);
            newChunksData.push(data);

            this.worldData.chunkDataDictionary.set(parseVec3ToInt(pos), data);
        }

        if (chunkConfigs.length > 0) {
            try {
                const results = await beeThreads
                    .turbo(chunkConfigs, {
                        context: {
                            pn_simplexNoise_src: PureNoise.simplexNoise.toString(),
                            pn_octavePerlin_src: PureNoise.octavePerlin.toString(),
                            pn_generateDomainNoise_src: PureNoise.generateDomainNoise.toString(),
                            pn_generateDomainOffset_src: PureNoise.generateDomainOffset.toString(),
                            pn_remapValue_src: PureNoise.remapValue.toString(),
                            pn_redistribution_src: PureNoise.redistribution.toString(),
                            pn_generateChunkMeshPure_src: generateChunkMeshPure.toString(),
                            BlockType: PureTerrain.BlockType,
                        },
                    })
                    .map(PureTerrain.generateChunkDataPure);

                for (let i = 0; i < results.length; i++) {
                    applyChunkData(newChunksData[i], results[i].blocks);
                    newChunksData[i].meshHash = newChunksData[i].calculateBlockHash();
                }

                const chunksNeedingMesh = this.filterChunksNeedingMeshUpdate(newChunksData);
                const meshConfigs = this.buildMeshConfigs(chunksNeedingMesh);

                if (meshConfigs.length > 0) {
                    const meshResults = await beeThreads
                        .turbo(meshConfigs, {
                            context: {
                                pn_generateChunkMeshPure_src: generateChunkMeshPure.toString(),
                            },
                        })
                        .map(meshGenerationWorker);

                    for (let i = 0; i < meshResults.length; i++) {
                        const chunk = chunksNeedingMesh[i];
                        const posKey = parseVec3ToInt(chunk.worldPosition);
                        const mesh = meshResults[i];

                        this.generatedMeshes.set(posKey, mesh);
                        this.meshCache.set(posKey, { mesh, blockHash: chunk.meshHash });
                        chunk.cachedMesh = mesh;
                    }
                }

                for (const chunk of newChunksData) {
                    const posKey = parseVec3ToInt(chunk.worldPosition);
                    if (!this.generatedMeshes.has(posKey) && chunk.cachedMesh) {
                        this.generatedMeshes.set(posKey, chunk.cachedMesh);
                    }
                }
            } catch (error) {
                console.error('Worker generation failed:', error);
            }
        }

        for (const pos of worldGenerationData.chunkPositionsToCreate) {
            const data = this.worldData.chunkDataDictionary.get(parseVec3ToInt(pos));

            if (!data) {
                console.error('Chunk data not found', pos);
                continue;
            }

            if (!data.isModified) continue;
            if (this.worldData.chunkDictionary.has(parseVec3ToInt(data.worldPosition))) continue;

            const pureMesh = this.generatedMeshes.get(parseVec3ToInt(data.worldPosition)) ?? null;
            this.meshCreationQueue.push({ chunkData: data, meshData: pureMesh });
        }
    }

    private meshUpdateQueue: ChunkData[] = [];

    queueChunkMeshUpdate(chunkData: ChunkData): void {
        if (!this.meshUpdateQueue.includes(chunkData)) {
            this.meshUpdateQueue.push(chunkData);
        }
    }

    private async processMeshUpdateQueue(): Promise<void> {
        if (this.meshUpdateQueue.length === 0 || this.isGenerating) return;

        const chunk = this.meshUpdateQueue.shift();
        if (!chunk) return;

        this.isGenerating = true;

        try {
            const config = this.buildSingleMeshConfig(chunk);
            // Generate mesh in worker
            const meshResults = await beeThreads
                .turbo([config], {
                    context: {
                        pn_generateChunkMeshPure_src: generateChunkMeshPure.toString(),
                    },
                })
                .map(meshGenerationWorker);

            const meshData = meshResults[0];
            const renderer = this.worldData.chunkDictionary.get(parseVec3ToInt(chunk.worldPosition));

            if (renderer) {
                if ((renderer as any).updateChunkWithPureData) {
                    (renderer as any).updateChunkWithPureData(meshData);
                }
            }

            chunk.cachedMesh = meshData;
            chunk.meshHash = chunk.calculateBlockHash();
        } catch (error) {
            console.error('Mesh update failed:', error);
        } finally {
            this.isGenerating = false;
        }
    }

    private buildSingleMeshConfig(chunk: ChunkData): MeshGenerationConfig {
        const pos = chunk.worldPosition;

        const rightPos = parseVec3ToInt(new Vec3(pos.x + this.chunkSize, pos.y, pos.z));
        const leftPos = parseVec3ToInt(new Vec3(pos.x - this.chunkSize, pos.y, pos.z));
        const forwardPos = parseVec3ToInt(new Vec3(pos.x, pos.y, pos.z + this.chunkSize));
        const backPos = parseVec3ToInt(new Vec3(pos.x, pos.y, pos.z - this.chunkSize));

        const rightChunk = this.worldData.chunkDataDictionary.get(rightPos);
        const leftChunk = this.worldData.chunkDataDictionary.get(leftPos);
        const forwardChunk = this.worldData.chunkDataDictionary.get(forwardPos);
        const backChunk = this.worldData.chunkDataDictionary.get(backPos);

        return {
            blocks: Array.from(chunk.blocks),
            chunkSize: this.chunkSize,
            chunkHeight: this.chunkHeight,
            tileSizeX: BlockDataManager.tileSizeX,
            tileSizeY: BlockDataManager.tileSizeY,
            textureOffset: BlockDataManager.textureOffset,
            blockDefinitions: this.blockDefinitions,
            neighborRight: rightChunk ? this.extractEdgeX(rightChunk, 0) : undefined,
            neighborLeft: leftChunk ? this.extractEdgeX(leftChunk, this.chunkSize - 1) : undefined,
            neighborForward: forwardChunk ? this.extractEdgeZ(forwardChunk, 0) : undefined,
            neighborBack: backChunk ? this.extractEdgeZ(backChunk, this.chunkSize - 1) : undefined,
        };
    }

    // Build mesh generation configs with neighbor edge data
    private buildMeshConfigs(chunks: ChunkData[]): MeshGenerationConfig[] {
        const configs: MeshGenerationConfig[] = [];

        for (const chunk of chunks) {
            const pos = chunk.worldPosition;

            const rightPos = parseVec3ToInt(new Vec3(pos.x + this.chunkSize, pos.y, pos.z));
            const leftPos = parseVec3ToInt(new Vec3(pos.x - this.chunkSize, pos.y, pos.z));
            const forwardPos = parseVec3ToInt(new Vec3(pos.x, pos.y, pos.z + this.chunkSize));
            const backPos = parseVec3ToInt(new Vec3(pos.x, pos.y, pos.z - this.chunkSize));

            const rightChunk = this.worldData.chunkDataDictionary.get(rightPos);
            const leftChunk = this.worldData.chunkDataDictionary.get(leftPos);
            const forwardChunk = this.worldData.chunkDataDictionary.get(forwardPos);
            const backChunk = this.worldData.chunkDataDictionary.get(backPos);

            configs.push({
                blocks: Array.from(chunk.blocks),
                chunkSize: this.chunkSize,
                chunkHeight: this.chunkHeight,
                tileSizeX: BlockDataManager.tileSizeX,
                tileSizeY: BlockDataManager.tileSizeY,
                textureOffset: BlockDataManager.textureOffset,
                blockDefinitions: this.blockDefinitions,
                neighborRight: rightChunk ? this.extractEdgeX(rightChunk, 0) : undefined,
                neighborLeft: leftChunk ? this.extractEdgeX(leftChunk, this.chunkSize - 1) : undefined,
                neighborForward: forwardChunk ? this.extractEdgeZ(forwardChunk, 0) : undefined,
                neighborBack: backChunk ? this.extractEdgeZ(backChunk, this.chunkSize - 1) : undefined,
            });
        }

        return configs;
    }

    /**
     * Filter chunks that actually need mesh regeneration.
     * Chunks with unchanged block data can use cached meshes.
     */
    private filterChunksNeedingMeshUpdate(chunks: ChunkData[]): ChunkData[] {
        return chunks.filter(chunk => {
            const posKey = parseVec3ToInt(chunk.worldPosition);
            const cached = this.meshCache.get(posKey);

            if (!cached) {
                return true;
            }

            if (cached.blockHash !== chunk.meshHash) {
                return true;
            }

            chunk.cachedMesh = cached.mesh;
            return false;
        });
    }

    // Extract a YZ slice at given X coordinate (for left/right neighbors)
    private extractEdgeX(chunk: ChunkData, x: number): number[] {
        const edge: number[] = new Array(this.chunkHeight * this.chunkSize);
        for (let y = 0; y < this.chunkHeight; y++) {
            for (let z = 0; z < this.chunkSize; z++) {
                const srcIdx = x + y * this.chunkSize + z * this.chunkSize * this.chunkHeight;
                const dstIdx = y * this.chunkSize + z;
                edge[dstIdx] = chunk.blocks[srcIdx];
            }
        }
        return edge;
    }

    // Extract a XY slice at given Z coordinate (for forward/back neighbors)
    private extractEdgeZ(chunk: ChunkData, z: number): number[] {
        const edge: number[] = new Array(this.chunkHeight * this.chunkSize);
        for (let y = 0; y < this.chunkHeight; y++) {
            for (let x = 0; x < this.chunkSize; x++) {
                const srcIdx = x + y * this.chunkSize + z * this.chunkSize * this.chunkHeight;
                const dstIdx = y * this.chunkSize + x;
                edge[dstIdx] = chunk.blocks[srcIdx];
            }
        }
        return edge;
    }

    getBlockFromChunkCoordinates(x: number, y: number, z: number): PureTerrain.BlockType {
        const pos: Vec3 = Chunk.chunkPositionFromBlockCoords(this, x, y, z);
        const containerChunk: ChunkData | undefined = this.worldData.chunkDataDictionary.get(parseVec3ToInt(pos));

        if (containerChunk === undefined) {
            return PureTerrain.BlockType.Empty;
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
        this.meshCache.clear();
        this.generatedMeshes.clear();

        for (const batch of this.batchGroups.values()) {
            if (batch.batchNode) {
                batch.batchNode.destroy();
            }
        }
        this.batchGroups.clear();
        this.chunkToBatch.clear();
    }

    /**
     * Remove a specific chunk's cached mesh.
     * Call this when a chunk is unloaded.
     */
    clearChunkCache(posKey: number): void {
        this.meshCache.delete(posKey);
        this.generatedMeshes.delete(posKey);

        const batchId = this.chunkToBatch.get(posKey);
        if (batchId !== undefined) {
            const batch = this.batchGroups.get(batchId);
            if (batch) {
                batch.isDirty = true;
            }
            this.chunkToBatch.delete(posKey);
        }
    }
}
