import { _decorator, Component, director, geometry, instantiate, Node, PhysicsSystem, Prefab, Vec3 } from 'cc';

import OrbitCamera from '../scripts/camera/orbitCamera';
import { World } from '../scripts/map/world';
import WorldHelper from '../scripts/map/worldHelper';
const { ccclass, property, type } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    @type(World)
    worldRef!: World;

    @type(Prefab)
    player!: Prefab;

    @type(Node)
    playerInstance?: Node;

    @property
    detectionTime = 1;

    @type(Node)
    spawnPoint!: Node;

    @type(OrbitCamera)
    cameraReference!: OrbitCamera;

    private currentPlayerChunkPosition = new Vec3();
    private currentChunkCenter = new Vec3();
    private isInstantiated = false;

    spawnPlayer(postReference: Node): void {
        if (this.isInstantiated) return;
        const halfChunkSize = this.worldRef.chunkSize / 2;

        // Create a ray from the spawn point downwards
        const raycastStartPosition = new Vec3(-halfChunkSize, 100, -halfChunkSize);
        const ray = new geometry.Ray();
        geometry.Ray.fromPoints(
            ray,
            raycastStartPosition,
            new Vec3(raycastStartPosition.x, raycastStartPosition.y - 120, raycastStartPosition.z)
        );

        // If the raycast hit something, set the player position to the hit point
        if (!PhysicsSystem.instance.raycast(ray)) return;

        this.isInstantiated = true;

        this.playerInstance = instantiate(this.player);
        this.playerInstance.setPosition(PhysicsSystem.instance.raycastResults[0].hitPoint);

        postReference.active = false;
        this.cameraReference.node.active = false;

        director.getScene()!.addChild(this.playerInstance);
        this.startCheckingTheMap();
    }

    startCheckingTheMap(): void {
        this.setCurrentChunkCoordinates();
        this.unscheduleAllCallbacks();

        this.schedule(this.checkIfShouldLoadNextPosition, this.detectionTime);
    }

    private checkIfShouldLoadNextPosition(): void {
        if (!this.playerInstance) return;
        console.log('checkIfShouldLoadNextPosition');
        if (
            Math.abs(this.currentChunkCenter.x - this.playerInstance.position.x) >= this.worldRef.chunkSize ||
            Math.abs(this.currentChunkCenter.z - this.playerInstance.position.z) >= this.worldRef.chunkSize ||
            Math.abs(this.currentPlayerChunkPosition.y - this.playerInstance.position.y) >= this.worldRef.chunkHeight
        ) {
            this.worldRef.loadAdditionalChunksRequest(this.playerInstance);
        }
    }

    private setCurrentChunkCoordinates(): void {
        if (!this.playerInstance) return;

        const roundedPosition = new Vec3(
            Math.round(this.playerInstance.position.x),
            Math.round(this.playerInstance.position.y),
            Math.round(this.playerInstance.position.z)
        );

        this.currentPlayerChunkPosition = WorldHelper.chunkPositionFromBlockCoords(this.worldRef, roundedPosition);
        this.currentChunkCenter.x = this.currentPlayerChunkPosition.x + this.worldRef.chunkSize / 2;
        this.currentChunkCenter.z = this.currentPlayerChunkPosition.z + this.worldRef.chunkSize / 2;
    }
}
