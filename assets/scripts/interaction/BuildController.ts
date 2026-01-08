import { _decorator, Camera, Component, director, Vec3 } from 'cc';

import { Chunk } from '../map/chunk';
import { BlockType } from '../map/models';
import { parseVec3ToInt } from '../map/utils';
import { World } from '../map/world';
import inputMap from '../movement/input';
import { BlockRaycaster } from './BlockRaycaster';

const { ccclass, property, type } = _decorator;

@ccclass('BuildController')
export class BuildController extends Component {
    @type(BlockRaycaster)
    raycaster!: BlockRaycaster;

    @type(World)
    world!: World;

    @type(Camera)
    camera!: Camera;

    private selectedBlockType: BlockType = BlockType.Dirt;
    private lastRightClickTime = 0;
    private placeCooldown = 0.25;

    protected onLoad(): void {
        const world = director.getScene()!.getChildByName('WorldManager')!.getComponent(World);
        this.world = world!;
    }

    update(dt: number): void {
        // Simple cooldown for right click placement
        if (inputMap.mouse.right) {
            const now = Date.now() / 1000;
            if (now - this.lastRightClickTime > this.placeCooldown) {
                this.attemptPlace();
                this.lastRightClickTime = now;
            }
        } else {
            this.lastRightClickTime = 0; // Reset so next click is instant? No, that allows spamming if clicking fast.
            // Actually, reset is fine if we want separate clicks.
            // But if we want continuous placement (holding), cooldown applies.
            // If we want single click per press, we need a flag 'wasPressed'.
            // For now, cooldown is fine.
        }
    }

    attemptPlace(): void {
        const hit = this.raycaster.raycastBlock(this.camera, this.world);
        if (!hit) return;

        // Calculate placement position (adjacent to hit face)
        const placePos = new Vec3(
            hit.blockWorldPosition.x + hit.hitNormal.x,
            hit.blockWorldPosition.y + hit.hitNormal.y,
            hit.blockWorldPosition.z + hit.hitNormal.z
        );

        // Validate placement (not inside player, valid chunk, etc.)
        if (!this.canPlace(placePos)) return;

        // Find target chunk
        const chunkPos = Chunk.chunkPositionFromBlockCoords(this.world, placePos.x, placePos.y, placePos.z);

        const chunkData = this.world.worldData.chunkDataDictionary.get(parseVec3ToInt(chunkPos));

        if (!chunkData) return;

        // Place block
        const localPos = Chunk.getBlockInChunkCoordinates(chunkData, placePos);
        Chunk.setBlock(chunkData, localPos, this.selectedBlockType);
        chunkData.invalidateMeshCache();

        // Regenerate mesh
        if (this.world.queueChunkMeshUpdate) {
            this.world.queueChunkMeshUpdate(chunkData);
        }

        // Update adjacent chunks if on boundary
        this.updateAdjacentChunks(placePos);
    }

    private canPlace(pos: Vec3): boolean {
        return true;
    }

    private updateAdjacentChunks(worldPos: Vec3): void {
        const localX = worldPos.x % this.world.chunkSize;
        const localZ = worldPos.z % this.world.chunkSize;
        // TODO: Check Y?

        const adjacentOffsets: Vec3[] = [];

        if (localX === 0) adjacentOffsets.push(new Vec3(-1, 0, 0));
        if (localX === this.world.chunkSize - 1) adjacentOffsets.push(new Vec3(1, 0, 0));
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
}
