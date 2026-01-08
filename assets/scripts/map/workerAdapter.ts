import { Vec2, Vec3 } from 'cc';

import { BiomeGenerator } from './biomeGenerator';
import { BlockDataManager } from './blockDataManager';
import { ChunkData } from './chunkData';
import { StoneLayer } from './layers/stoneLayer';
import { SurfaceLayer } from './layers/surfaceLayer';
import { UndergroundLayer } from './layers/undergroundLayer';
import { WaterLayer } from './layers/waterLayer';
import { MeshData } from './meshData';
import { BlockType } from './models';
import { BlockDefinition, PureMeshData } from './pure/pureMesh';
import { ChunkGenerationConfig } from './pure/pureTerrain';
import { grad3, perm } from './utils/simplexNoise';

export function createBlockDefinitions(): Record<number, BlockDefinition> {
    const defs: Record<number, BlockDefinition> = {};
    BlockDataManager.blockTextureDataDictionary.forEach((data, type) => {
        defs[type] = {
            blockType: type,
            isSolid: data.isSolid,
            generatesCollider: data.generatesCollider,
            up: { x: data.up.x, y: data.up.y },
            down: { x: data.down.x, y: data.down.y },
            side: { x: data.side.x, y: data.side.y },
        };
    });
    return defs;
}

export function createChunkConfig(
    chunkData: ChunkData,
    biomeGenerator: BiomeGenerator,
    seedOffset: Vec2,
    blockDefs: Record<number, BlockDefinition>
): ChunkGenerationConfig {
    const noiseToPure = (n: any) => ({
        redistributionModifier: n.redistributionModifier,
        noiseZoom: n.noiseZoom,
        persistance: n.persistance,
        exponent: n.exponent,
        octaves: n.octaves,
        offset: { x: n.offset.x, y: n.offset.y },
        worldOffset: { x: n.worldOffset.x, y: n.worldOffset.y },
    });

    let surfaceBlockType = BlockType.GrassDirt;
    let undergroundBlockType = BlockType.Dirt;
    let waterLevel = 1;

    let currentHandler = biomeGenerator.startingLayerHandler;
    while (currentHandler) {
        if (currentHandler instanceof SurfaceLayer) {
            surfaceBlockType = currentHandler.surfaceBlockType;
        }
        if (currentHandler instanceof UndergroundLayer) {
            undergroundBlockType = currentHandler.undergroundBlockType;
        }
        if (currentHandler instanceof WaterLayer) {
            waterLevel = currentHandler.waterLevel;
        }
        currentHandler = currentHandler.nextHandler!;
    }

    const waterLayerHandler = biomeGenerator.detailLayerHandlers.find(h => h instanceof WaterLayer) as WaterLayer;
    if (waterLayerHandler) {
        waterLevel = waterLayerHandler.waterLevel;
    }

    let stoneNoiseSettings = noiseToPure(biomeGenerator.noiseSettings);
    let stoneThreshold = 0.5;
    let stoneBlockType = BlockType.Stone;
    let stoneDomainSettings = {
        noiseDomainX: noiseToPure(biomeGenerator.domainWarping.noiseDomainX),
        noiseDomainY: noiseToPure(biomeGenerator.domainWarping.noiseDomainY),
        amplitudeX: biomeGenerator.domainWarping.amplitudeX,
        amplitudeY: biomeGenerator.domainWarping.amplitudeY,
    };

    const stoneLayer = biomeGenerator.detailLayerHandlers.find(h => h instanceof StoneLayer) as StoneLayer;
    if (stoneLayer) {
        stoneNoiseSettings = noiseToPure(stoneLayer.stoneNoiseSettings);
        stoneThreshold = stoneLayer.stoneThreshold;
        stoneBlockType = stoneLayer.surfaceBlockType;
        stoneDomainSettings = {
            noiseDomainX: noiseToPure(stoneLayer.domainWarping.noiseDomainX),
            noiseDomainY: noiseToPure(stoneLayer.domainWarping.noiseDomainY),
            amplitudeX: stoneLayer.domainWarping.amplitudeX,
            amplitudeY: stoneLayer.domainWarping.amplitudeY,
        };
    }

    return {
        worldPosition: { x: chunkData.worldPosition.x, y: chunkData.worldPosition.z },
        chunkWorldPosY: chunkData.worldPosition.y,
        chunkSize: chunkData.chunkSize,
        chunkHeight: chunkData.chunkHeight,
        seedOffset: { x: seedOffset.x, y: seedOffset.y },
        surfaceNoiseSettings: noiseToPure(biomeGenerator.noiseSettings),
        stoneNoiseSettings,
        domainWarpingSettings: {
            noiseDomainX: noiseToPure(biomeGenerator.domainWarping.noiseDomainX),
            noiseDomainY: noiseToPure(biomeGenerator.domainWarping.noiseDomainY),
            amplitudeX: biomeGenerator.domainWarping.amplitudeX,
            amplitudeY: biomeGenerator.domainWarping.amplitudeY,
        },
        stoneDomainWarpingSettings: stoneDomainSettings,
        useDomainWarping: biomeGenerator.useDomainWarping,
        stoneThreshold,
        waterHeight: waterLevel,
        surfaceBlockType,
        undergroundBlockType,
        stoneBlockType,
        tileSizeX: BlockDataManager.tileSizeX,
        tileSizeY: BlockDataManager.tileSizeY,
        textureOffset: BlockDataManager.textureOffset,
        blockDefinitions: blockDefs,
        perm: Array.from(perm),
        grad3: grad3.map(g => Array.from(g)),
    };
}

export function applyChunkData(chunkData: ChunkData, blocks: number[]) {
    chunkData.blocks = blocks as unknown as BlockType[];
    chunkData.isModified = true;
}

export function convertPureMeshData(pure: PureMeshData): MeshData {
    const mesh = new MeshData(false);

    // Main Mesh
    for (let i = 0; i < pure.vertices.length; i += 3) {
        mesh.vertices.push(new Vec3(pure.vertices[i], pure.vertices[i + 1], pure.vertices[i + 2]));
    }

    mesh.triangles = pure.indices;

    for (let i = 0; i < pure.uvs.length; i += 2) {
        mesh.uv.push(new Vec2(pure.uvs[i], pure.uvs[i + 1]));
    }

    // Collision Mesh
    for (let i = 0; i < pure.collisionVertices.length; i += 3) {
        mesh.collisionVertices.push(
            new Vec3(pure.collisionVertices[i], pure.collisionVertices[i + 1], pure.collisionVertices[i + 2])
        );
    }
    mesh.collisionTriangles = pure.collisionIndices;

    // Water Mesh
    if (pure.waterMesh && pure.waterMesh.vertices.length > 0) {
        mesh.waterMesh = new MeshData(false);
        const wm = mesh.waterMesh;

        for (let i = 0; i < pure.waterMesh.vertices.length; i += 3) {
            wm.vertices.push(
                new Vec3(pure.waterMesh.vertices[i], pure.waterMesh.vertices[i + 1], pure.waterMesh.vertices[i + 2])
            );
        }
        wm.triangles = pure.waterMesh.indices;

        for (let i = 0; i < pure.waterMesh.uvs.length; i += 2) {
            wm.uv.push(new Vec2(pure.waterMesh.uvs[i], pure.waterMesh.uvs[i + 1]));
        }
    }

    return mesh;
}
