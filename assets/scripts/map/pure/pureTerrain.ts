/* eslint-disable complexity, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-explicit-any, @typescript-eslint/naming-convention */
import { BlockDefinition, MeshGenerationConfig, PureMeshData } from './pureMesh';
import { DomainWarpingSettingsLike, NoiseSettingsLike, Vec2Like } from './pureNoise';

// Implicitly injected context variables (strings)
declare const pn_simplexNoise_src: string;
declare const pn_octavePerlin_src: string;
declare const pn_generateDomainNoise_src: string;
declare const pn_generateDomainOffset_src: string;
declare const pn_remapValue_src: string;
declare const pn_redistribution_src: string;
declare const pn_generateChunkMeshPure_src: string;

export enum BlockType {
    Empty = 0,
    Air = 1,
    GrassDirt = 2,
    Dirt = 3,
    SandDirt = 4,
    Sand = 5,
    Stone = 6,
    Water = 7,
    Tree = 8,
    Grass = 9,
}

export interface ChunkGenerationConfig {
    worldPosition: Vec2Like;
    chunkWorldPosY: number;
    chunkSize: number;
    chunkHeight: number;
    seedOffset: Vec2Like;
    surfaceNoiseSettings: NoiseSettingsLike;
    stoneNoiseSettings: NoiseSettingsLike;
    domainWarpingSettings: DomainWarpingSettingsLike;
    stoneDomainWarpingSettings: DomainWarpingSettingsLike;
    useDomainWarping: boolean;
    stoneThreshold: number;
    waterHeight: number;
    surfaceBlockType: BlockType;
    undergroundBlockType: BlockType;
    stoneBlockType: BlockType;
    tileSizeX: number;
    tileSizeY: number;
    textureOffset: number;
    blockDefinitions: Record<number, BlockDefinition>;
    perm: number[];
    grad3: number[][];
}

export interface ChunkGenerationResult {
    blocks: number[];
    mesh: PureMeshData;
}

export const generateChunkDataPure = (config: ChunkGenerationConfig): ChunkGenerationResult => {
    const getPureFunctions = () => {
        const g = globalThis as any;
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        const compile = (name: string, src: string) => {
            const fn = new Function('return ' + src)();
            g[name] = fn;
            return fn;
        };

        if (!g._pureNoiseCache) {
            g._pureNoiseCache = {
                simplexNoise: compile('simplexNoise', pn_simplexNoise_src),
                octavePerlin: compile('octavePerlin', pn_octavePerlin_src),
                generateDomainOffset: compile('generateDomainOffset', pn_generateDomainOffset_src),
                generateDomainNoise: compile('generateDomainNoise', pn_generateDomainNoise_src),
                remapValue: compile('remapValue', pn_remapValue_src),
                redistribution: compile('redistribution', pn_redistribution_src),
            };
        }

        if (!g.generateChunkMeshPure) {
            compile('generateChunkMeshPure', pn_generateChunkMeshPure_src);
        }

        return g._pureNoiseCache;
    };

    getPureFunctions();

    const generateChunkMeshPure: (config: MeshGenerationConfig) => PureMeshData = (globalThis as any)
        .generateChunkMeshPure;

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const PureNoise = {
        get octavePerlin(): any {
            return (globalThis as any).octavePerlin;
        },
        get generateDomainNoise(): any {
            return (globalThis as any).generateDomainNoise;
        },
        get remapValue(): any {
            return (globalThis as any).remapValue;
        },
        get redistribution(): any {
            return (globalThis as any).redistribution;
        },
    };

    const {
        chunkSize,
        chunkHeight,
        worldPosition,
        chunkWorldPosY,
        seedOffset,
        surfaceNoiseSettings,
        stoneNoiseSettings,
        domainWarpingSettings,
        stoneDomainWarpingSettings,
        useDomainWarping,
        stoneThreshold,
        waterHeight,
        surfaceBlockType,
        undergroundBlockType,
        stoneBlockType,
        perm,
        grad3,
    } = config;

    const blocks = new Array<number>(chunkSize * chunkSize * chunkHeight).fill(BlockType.Empty);

    const getIndex = (lx: number, ly: number, lz: number): number => {
        return lx + chunkSize * ly + chunkSize * chunkHeight * lz;
    };

    const setBlock = (lx: number, ly: number, lz: number, type: BlockType) => {
        if (lx >= 0 && lx < chunkSize && ly >= 0 && ly < chunkHeight && lz >= 0 && lz < chunkSize) {
            const index = getIndex(lx, ly, lz);
            blocks[index] = type;
        }
    };

    const surfaceSettings = Object.assign({}, surfaceNoiseSettings, { worldOffset: seedOffset });
    const stoneSettings = Object.assign({}, stoneNoiseSettings, { worldOffset: seedOffset });
    const domainSettings = {
        noiseDomainX: Object.assign({}, domainWarpingSettings.noiseDomainX, { worldOffset: seedOffset }),
        noiseDomainY: Object.assign({}, domainWarpingSettings.noiseDomainY, { worldOffset: seedOffset }),
        amplitudeX: domainWarpingSettings.amplitudeX,
        amplitudeY: domainWarpingSettings.amplitudeY,
    };
    const stoneDomainSettings = {
        noiseDomainX: Object.assign({}, stoneDomainWarpingSettings.noiseDomainX, { worldOffset: seedOffset }),
        noiseDomainY: Object.assign({}, stoneDomainWarpingSettings.noiseDomainY, { worldOffset: seedOffset }),
        amplitudeX: stoneDomainWarpingSettings.amplitudeX,
        amplitudeY: stoneDomainWarpingSettings.amplitudeY,
    };

    for (let x = 0; x < chunkSize; x++) {
        for (let z = 0; z < chunkSize; z++) {
            const worldX = worldPosition.x + x;
            const worldZ = worldPosition.y + z;

            let terrainHeight = !useDomainWarping
                ? PureNoise.octavePerlin(worldX, worldZ, surfaceSettings, perm, grad3)
                : PureNoise.generateDomainNoise(worldX, worldZ, surfaceSettings, domainSettings, perm, grad3);

            terrainHeight = PureNoise.redistribution(terrainHeight, surfaceSettings);
            const surfaceHeight = PureNoise.remapValue(terrainHeight, 0, chunkHeight);

            const stoneNoise = PureNoise.generateDomainNoise(
                worldX,
                worldZ,
                stoneSettings,
                stoneDomainSettings,
                perm,
                grad3
            );
            const hasStone = stoneNoise > stoneThreshold;

            for (let y = 0; y < chunkHeight; y++) {
                let block = BlockType.Empty;

                if (y > surfaceHeight) {
                    block = BlockType.Air;
                } else if (y == surfaceHeight) {
                    block = surfaceBlockType;
                } else {
                    block = undergroundBlockType; // Underground (y < surfaceHeight)
                }

                setBlock(x, y, z, block);
            }

            if (chunkWorldPosY <= surfaceHeight) {
                if (hasStone) {
                    let endPosition = surfaceHeight;
                    if (chunkWorldPosY < 0) {
                        endPosition = chunkWorldPosY + chunkHeight;
                    }

                    for (let i = chunkWorldPosY; i <= endPosition; i++) {
                        setBlock(x, i, z, stoneBlockType);
                    }
                }
            }

            for (let y = 0; y < chunkHeight; y++) {
                if (y > surfaceHeight && y <= waterHeight) {
                    const index = getIndex(x, y, z);
                    if (blocks[index] === BlockType.Air) {
                        setBlock(x, y, z, BlockType.Water);

                        if (y == surfaceHeight + 1) {
                            setBlock(x, y - 1, z, BlockType.Sand);
                        }
                    }
                }
            }
        }
    }

    const meshConfig: MeshGenerationConfig = {
        blocks,
        chunkSize,
        chunkHeight,
        tileSizeX: config.tileSizeX,
        tileSizeY: config.tileSizeY,
        textureOffset: config.textureOffset,
        blockDefinitions: config.blockDefinitions,
    };

    const mesh = generateChunkMeshPure(meshConfig);

    return { blocks, mesh };
};
