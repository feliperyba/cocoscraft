import { _decorator, Camera, Component, geometry, PhysicsRayResult, PhysicsSystem, Vec3 } from 'cc';

import { Chunk } from '../map/chunk';
import { ChunkData } from '../map/chunkData';
import { BlockType } from '../map/models';
import { parseVec3ToInt } from '../map/utils';
import { World } from '../map/world';

const { ccclass, property } = _decorator;

export interface BlockHitResult {
    hit: boolean;
    blockWorldPosition: Vec3;
    blockLocalPosition: Vec3;
    chunkData: ChunkData;
    blockType: BlockType;
    hitNormal: Vec3;
    hitPoint: Vec3;
}

@ccclass('BlockRaycaster')
export class BlockRaycaster extends Component {
    @property
    maxDistance = 5;

    @property
    airPlaceDistance = 3.5;

    private ray = new geometry.Ray();

    raycastBlock(camera: Camera, world: World): BlockHitResult | null {
        this.ray.o.set(camera.node.worldPosition);
        const forward = new Vec3();
        Vec3.transformQuat(forward, Vec3.FORWARD, camera.node.worldRotation);
        this.ray.d.set(forward);

        if (
            PhysicsSystem.instance.raycastClosest(
                this.ray,
                1 << 0,
                this.maxDistance
            )
        ) {
            const result = PhysicsSystem.instance.raycastClosestResult;
            return this.processHit(result, world);
        }

        return null;
    }

    /**
     * Compute a floating air placement target at a fixed distance
     * along the camera forward direction.
     */
    getAirPlacementTarget(camera: Camera, world: World): Vec3 | null {
        const origin = camera.node.worldPosition;
        const forward = new Vec3();
        Vec3.transformQuat(forward, Vec3.FORWARD, camera.node.worldRotation);

        const target = new Vec3(
            Math.round(origin.x + forward.x * this.airPlaceDistance),
            Math.round(origin.y + forward.y * this.airPlaceDistance),
            Math.round(origin.z + forward.z * this.airPlaceDistance),
        );

        const blockType = this.getBlockTypeAt(world, target.x, target.y, target.z);
        if (blockType !== BlockType.Air && blockType !== BlockType.Empty) return null;

        return target;
    }

    private getBlockTypeAt(world: World, x: number, y: number, z: number): BlockType {
        const chunkPos = Chunk.chunkPositionFromBlockCoords(world, x, y, z);
        const chunkData = world.worldData.chunkDataDictionary.get(parseVec3ToInt(chunkPos));
        if (!chunkData) return BlockType.Empty;

        const localPos = new Vec3(
            x - chunkPos.x,
            y - chunkPos.y,
            z - chunkPos.z,
        );

        return Chunk.getBlockFromChunkCoordinatesVec3(chunkData, localPos);
    }

    private processHit(result: PhysicsRayResult, world: World): BlockHitResult | null {
        const hitPoint = result.hitPoint;
        const normal = result.hitNormal;

        const blockWorldPos = new Vec3(
            Math.round(hitPoint.x - normal.x * 0.01),
            Math.round(hitPoint.y - normal.y * 0.01),
            Math.round(hitPoint.z - normal.z * 0.01),
        );

        const chunkPos = Chunk.chunkPositionFromBlockCoords(world, blockWorldPos.x, blockWorldPos.y, blockWorldPos.z);

        const chunkData = world.worldData.chunkDataDictionary.get(parseVec3ToInt(chunkPos));

        if (!chunkData) return null;

        const localPos = new Vec3(
            blockWorldPos.x - chunkPos.x,
            blockWorldPos.y - chunkPos.y,
            blockWorldPos.z - chunkPos.z,
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
