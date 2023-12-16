import { _decorator, Component, director, instantiate, Node, Prefab } from 'cc';

import OrbitCamera from '../scripts/camera/orbitCamera';
const { ccclass, type } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    @type(Prefab)
    player!: Prefab;

    @type(Node)
    playerInstance?: Node;

    @type(Node)
    spawnPoint!: Node;

    @type(OrbitCamera)
    cameraReference!: OrbitCamera;

    isInstantiated = false;

    spawnPlayer(postReference: Node): void {
        if (this.isInstantiated) return;
        this.isInstantiated = true;

        this.playerInstance = instantiate(this.player);
        this.playerInstance.setPosition(this.spawnPoint.position);

        postReference.active = false;
        this.cameraReference.enabled = false;

        director.getScene()!.addChild(this.playerInstance);
    }
}
