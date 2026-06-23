import { _decorator, Camera, Component, director, geometry, PhysicsRayResult, PhysicsSystem, Vec3 } from 'cc';

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
    private _forward = new Vec3();
    private _cachedFrame = -1;
    private _cachedResult: BlockHitResult | null = null;

    raycastBlock(camera: Camera, world: World): BlockHitResult | null {
        // Per-frame cache: if already raycasted this frame, return cached result
        const frame = director.getTotalFrames();
        if (frame === this._cachedFrame) return this._cachedResult;

        this._cachedFrame = frame;
        this.ray.o.set(camera.node.worldPosition);
        Vec3.transformQuat(this._forward, Vec3.FORWARD, camera.node.worldRotation);
        this.ray.d.set(this._forward);

        if (
            PhysicsSystem.instance.raycastClosest(
                this.ray,
                1 << 0,
                this.maxDistance
            )
        ) {
            const result = PhysicsSystem.instance.raycastClosestResult;
            this._cachedResult = this.processHit(result, world);
        } else {
            this._cachedResult = null;
        }

        return this._cachedResult;
    }

    /**
     * Compute a floating air placement target at a fixed distance
     * along the camera forward direction.
     */
    getAirPlacementTarget(camera: Camera, world: World): Vec3 | null {
        const origin = camera.node.worldPosition;
        Vec3.transformQuat(this._forward, Vec3.FORWARD, camera.node.worldRotation);

        const tx = Math.round(origin.x + this._forward.x * this.airPlaceDistance);
        const ty = Math.round(origin.y + this._forward.y * this.airPlaceDistance);
        const tz = Math.round(origin.z + this._forward.z * this.airPlaceDistance);

        const blockType = this.getBlockTypeAt(world, tx, ty, tz);
        if (blockType !== BlockType.Air && blockType !== BlockType.Empty) return null;

        return new Vec3(tx, ty, tz);
    }

    private _localPos = new Vec3();

    private getBlockTypeAt(world: World, x: number, y: number, z: number): BlockType {
        const chunkPos = Chunk.chunkPositionFromBlockCoords(world, x, y, z);
        const chunkData = world.worldData.chunkDataDictionary.get(parseVec3ToInt(chunkPos));
        if (!chunkData) return BlockType.Empty;

        this._localPos.set(
            x - chunkPos.x,
            y - chunkPos.y,
            z - chunkPos.z,
        );

        return Chunk.getBlockFromChunkCoordinatesVec3(chunkData, this._localPos);
    }

    private _hitNormal = new Vec3();
    private _hitPoint = new Vec3();

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

        this._hitNormal.set(normal);
        this._hitPoint.set(hitPoint);

        return {
            hit: true,
            blockWorldPosition: blockWorldPos,
            blockLocalPosition: localPos,
            chunkData,
            blockType,
            hitNormal: this._hitNormal,
            hitPoint: this._hitPoint,
        };
    }
}
