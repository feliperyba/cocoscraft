import { _decorator, Component, instantiate, Node, Prefab } from 'cc';
import { director } from 'cc';

import OrbitCamera from '../scripts/camera/orbitCamera';
const { ccclass, type } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    @type(Prefab)
    player!: Prefab;

    @type(Node)
    spawnPoint!: Node;

    @type(OrbitCamera)
    cameraReference!: OrbitCamera;

    isInstantiated = false;

    spawnPlayer(): void {
        if (this.isInstantiated) return;
        this.isInstantiated = true;

        const player = instantiate(this.player);
        player.setPosition(this.spawnPoint.position);
        this.cameraReference.target = player;

        director.getScene()!.addChild(player);
    }
}
