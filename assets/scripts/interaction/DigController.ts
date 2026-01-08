import { _decorator, Camera, Component, director, Node, Scene, Vec3 } from 'cc';

import { ItemDropManager } from '../items/ItemDropManager';
import { Chunk } from '../map/chunk';
import { ChunkData } from '../map/chunkData';
import { BlockType } from '../map/models';
import { parseVec3ToInt } from '../map/utils';
import { World } from '../map/world';
import inputMap from '../movement/input';
import { BLOCK_HARDNESS } from './BlockHardness';
import { BlockHitResult, BlockRaycaster } from './BlockRaycaster';
import { BreakParticleEmitter } from './BreakParticleEmitter';

const { ccclass, type } = _decorator;

enum BreakingState {
    None,
    Breaking,
    Completed,
}

interface BlockBreakingProgress {
    blockWorldPosition: Vec3;
    chunkData: ChunkData;
    blockType: BlockType;
    progress: number; // 0.0 to 1.0
    breakTime: number; // Total time to break (based on block hardness)
    state: BreakingState;
}

@ccclass('DigController')
export class DigController extends Component {
    @type(BlockRaycaster)
    raycaster!: BlockRaycaster;

    @type(World)
    world!: World;

    @type(Camera)
    camera!: Camera;

    @type(BreakParticleEmitter)
    breakParticles!: BreakParticleEmitter;

    // @type(Node)
    // crackOverlay!: Node; // Overlay for cracking texture

    private currentBreak: BlockBreakingProgress | null = null;

    protected onLoad(): void {
        const world = director.getScene()!.getChildByName('WorldManager')!.getComponent(World);
        this.world = world!;
    }

    update(dt: number): void {
        if (inputMap.mouse.left) {
            this.processDig(dt);
        } else {
            this.cancelDig();
        }

        this.updateCrackingVisual();
    }

    private processDig(dt: number): void {
        const hit = this.raycaster.raycastBlock(this.camera, this.world);

        if (!hit || hit.blockType === BlockType.Air || hit.blockType === BlockType.Water) {
            this.cancelDig();
            return;
        }

        // Check if we're still targeting the same block
        if (this.currentBreak && !Vec3.equals(this.currentBreak.blockWorldPosition, hit.blockWorldPosition)) {
            this.cancelDig();
        }

        if (!this.currentBreak) {
            this.startBreaking(hit);
        }

        if (this.currentBreak) {
            this.currentBreak.progress += dt / this.currentBreak.breakTime;

            // Emit particles during breaking
            this.emitBreakingParticles(hit);

            if (this.currentBreak.progress >= 1.0) {
                this.completeBreak();
            }
        }
    }

    private startBreaking(hit: BlockHitResult): void {
        const hardness = BLOCK_HARDNESS[hit.blockType] ?? 1.0;

        this.currentBreak = {
            blockWorldPosition: hit.blockWorldPosition.clone(),
            chunkData: hit.chunkData,
            blockType: hit.blockType,
            progress: 0,
            breakTime: hardness,
            state: BreakingState.Breaking,
        };
    }

    private completeBreak(): void {
        if (!this.currentBreak) return;

        const { blockWorldPosition, chunkData, blockType } = this.currentBreak;

        this.removeBlock(blockWorldPosition, chunkData);
        //this.spawnBreakParticlesBurst(blockWorldPosition, blockType);
        // this.spawnItemDrop(blockWorldPosition, blockType);
        this.regenerateChunkMesh(chunkData);
        this.updateAdjacentChunks(blockWorldPosition);

        this.currentBreak = null;
    }

    private cancelDig(): void {
        this.currentBreak = null;
        // if (this.crackOverlay) {
        //     this.crackOverlay.active = false;
        // }
    }

    private removeBlock(worldPos: Vec3, chunkData: ChunkData): void {
        const localPos = Chunk.getBlockInChunkCoordinates(chunkData, worldPos);
        Chunk.setBlock(chunkData, localPos, BlockType.Air);
        chunkData.invalidateMeshCache();
    }

    private regenerateChunkMesh(chunkData: ChunkData): void {
        if (this.world.queueChunkMeshUpdate) {
            this.world.queueChunkMeshUpdate(chunkData);
        } else {
            console.warn('queueChunkMeshUpdate not implemented yet');
        }
    }

    private updateAdjacentChunks(worldPos: Vec3): void {
        // Check if block is on chunk boundary
        const localX = worldPos.x % this.world.chunkSize;

        const adjacentOffsets: Vec3[] = [];

        if (localX === 0) adjacentOffsets.push(new Vec3(-1, 0, 0));
        if (localX === this.world.chunkSize - 1) adjacentOffsets.push(new Vec3(1, 0, 0));

        const localZ = worldPos.z % this.world.chunkSize;
        if (localZ === 0) adjacentOffsets.push(new Vec3(0, 0, -1));
        if (localZ === this.world.chunkSize - 1) adjacentOffsets.push(new Vec3(0, 0, 1));

        for (const offset of adjacentOffsets) {
            const adjacentPos = Chunk.chunkPositionFromBlockCoords(
                this.world,
                worldPos.x + offset.x,
                worldPos.y + offset.y,
                worldPos.z + offset.z
            );

            const adjacentChunk = this.world.worldData.chunkDataDictionary.get(parseVec3ToInt(adjacentPos));

            if (adjacentChunk) {
                adjacentChunk.invalidateMeshCache();

                if (this.world.queueChunkMeshUpdate) {
                    this.world.queueChunkMeshUpdate(adjacentChunk);
                }
            }
        }
    }

    private updateCrackingVisual(): void {
        if (!this.currentBreak) return;

        // TODO: Implement cracking visualization
        /*
        const stage = Math.floor(this.currentBreak.progress * 10);
        // Set texture...
        
        this.crackOverlay.active = true;
        this.crackOverlay.setWorldPosition(
            this.currentBreak.blockWorldPosition.x + 0.5,
            this.currentBreak.blockWorldPosition.y + 0.5,
            this.currentBreak.blockWorldPosition.z + 0.5
        );
        */
    }

    private emitBreakingParticles(hit: BlockHitResult): void {
        if (this.breakParticles) {
            this.breakParticles.emitBreakingDust(hit.blockWorldPosition, hit.blockType);
        }
    }

    private spawnBreakParticlesBurst(pos: Vec3, blockType: BlockType): void {
        if (this.breakParticles) {
            this.breakParticles.emitDestroyBurst(pos, blockType);
        }
    }

    private spawnItemDrop(pos: Vec3, blockType: BlockType): void {
        ItemDropManager.spawnDrop({
            blockType: blockType,
            quantity: 1,
            position: pos,
        });
    }
}
