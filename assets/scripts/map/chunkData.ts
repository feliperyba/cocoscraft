import { _decorator, Vec3 } from 'cc';

import { BlockType } from './models/blocks';
import { PureWorld } from './pure/pureWorld';
import { World } from './world';

const { ccclass } = _decorator;

@ccclass('ChunkData')
export class ChunkData {
    blocks: BlockType[] = [];
    chunkSize: number;
    chunkHeight: number;
    worldNode: World | PureWorld;
    worldPosition: Vec3;
    isModified = false;

    // Mesh caching: hash of block data to detect changes
    meshHash = 0;
    // Cached mesh data from worker (optional)
    cachedMesh: import('./pure/pureMesh').PureMeshData | null = null;

    constructor(worldNode: World | PureWorld, worldPosition: Vec3, chunkSize: number, chunkHeight: number) {
        this.chunkSize = chunkSize;
        this.chunkHeight = chunkHeight;
        this.worldNode = worldNode;
        this.worldPosition = worldPosition;
    }

    onLoad(): void {
        this.blocks = new Array<BlockType>(this.chunkSize * this.chunkSize * this.chunkHeight);
    }

    /**
     * Calculate a fast hash of block data for change detection.
     * Uses FNV-1a hash algorithm for speed.
     */
    calculateBlockHash(): number {
        let hash = 2166136261; // FNV offset basis
        const FNV_PRIME = 16777619;
        for (let i = 0; i < this.blocks.length; i++) {
            hash ^= this.blocks[i];
            hash = Math.imul(hash, FNV_PRIME);
        }
        return hash >>> 0; // Convert to unsigned 32-bit
    }

    /**
     * Check if block data has changed since last mesh generation.
     * Updates the hash and returns true if changed.
     */
    hasBlocksChanged(): boolean {
        const newHash = this.calculateBlockHash();
        if (newHash !== this.meshHash) {
            this.meshHash = newHash;
            return true;
        }
        return false;
    }

    /**
     * Invalidate cached mesh (call when blocks are modified).
     */
    invalidateMeshCache(): void {
        this.cachedMesh = null;
        this.meshHash = 0;
    }
}
