import { _decorator, Camera, Component, geometry, PhysicsRayResult, PhysicsSystem, Vec2, Vec3, view } from 'cc';

import { Chunk } from '../map/chunk';
import { ChunkData } from '../map/chunkData';
import { BlockType } from '../map/models';
import { parseVec3ToInt } from '../map/utils';
import { World } from '../map/world';

const { ccclass, property } = _decorator;

export interface BlockHitResult {
    hit: boolean;
    blockWorldPosition: Vec3; // World position of hit block
    blockLocalPosition: Vec3; // Local position within chunk
    chunkData: ChunkData; // Reference to chunk
    blockType: BlockType; // Type of block hit
    hitNormal: Vec3; // Surface normal (for build placement)
    hitPoint: Vec3; // Exact hit point
}

@ccclass('BlockRaycaster')
export class BlockRaycaster extends Component {
    @property
    maxDistance = 5; // Max reach distance in blocks

    private ray = new geometry.Ray();

    /**
     * Cast ray from camera through screen center (crosshair)
     * @returns BlockHitResult or null if no block hit
     */
    raycastBlock(camera: Camera, world: World): BlockHitResult | null {
        this.ray.o.set(camera.node.worldPosition);
        const forward = new Vec3();
        Vec3.transformQuat(forward, Vec3.FORWARD, camera.node.worldRotation);
        this.ray.d.set(forward);

        // 2. Perform raycast against chunk colliders
        if (
            PhysicsSystem.instance.raycastClosest(
                this.ray,
                1 << 0, // Layer mask for terrain. Assuming DEFAULT layer (0) or similar.
                this.maxDistance
            )
        ) {
            const result = PhysicsSystem.instance.raycastClosestResult;
            return this.processHit(result, world);
        }

        return null;
    }

    private processHit(result: PhysicsRayResult, world: World): BlockHitResult | null {
        // Convert hit point to block coordinates
        // Offset slightly into the block using the normal
        const hitPoint = result.hitPoint;
        const normal = result.hitNormal;

        const blockWorldPos = new Vec3(
            Math.floor(hitPoint.x - normal.x * 0.01),
            Math.floor(hitPoint.y - normal.y * 0.01),
            Math.floor(hitPoint.z - normal.z * 0.01)
        );

        // Find which chunk this block belongs to
        const chunkPos = Chunk.chunkPositionFromBlockCoords(world, blockWorldPos.x, blockWorldPos.y, blockWorldPos.z);

        const chunkData = world.worldData.chunkDataDictionary.get(parseVec3ToInt(chunkPos));

        if (!chunkData) return null;

        const localPos = new Vec3(
            blockWorldPos.x - chunkPos.x,
            blockWorldPos.y - chunkPos.y,
            blockWorldPos.z - chunkPos.z
        );

        const blockType = Chunk.getBlockFromChunkCoordinatesVec3(chunkData, localPos);

        return {
            hit: true,
            blockWorldPosition: blockWorldPos,
            blockLocalPosition: localPos,
            chunkData,
            blockType,
            hitNormal: normal.clone(),
            hitPoint: hitPoint.clone(),
        };
    }
}
