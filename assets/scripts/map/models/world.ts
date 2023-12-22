import { Vec3 } from 'cc';

import { ChunkData } from '../chunkData';
import { ChunkRenderer } from '../chunkRenderer';

export class WorldGenerationData {
    chunkPositionsToCreate: Vec3[] = [];
    chunkDataPositionsToCreate: Vec3[] = [];
    chunkPositionsToRemove: number[] = [];
    chunkDataPositionsToRemove: number[] = [];
}

export class WorldData {
    chunkDataDictionary: Map<number, ChunkData> = new Map();
    chunkDictionary: Map<number, ChunkRenderer> = new Map();
    chunkSize: number = 0;
    chunkHeight: number = 0;
}
