import { _decorator, Component, Vec3 } from 'cc';

import { BlockType } from '../map/models';

const { ccclass, property } = _decorator;

export interface ItemDropConfig {
    blockType: BlockType;
    quantity: number;
    position: Vec3;
    velocity?: Vec3;
}

@ccclass('ItemDrop')
export class ItemDrop extends Component {
    @property
    bobSpeed = 2; // Floating animation speed

    @property
    bobHeight = 0.1; // Float height

    @property
    rotateSpeed = 90; // Degrees per second

    @property
    despawnTime = 300; // 5 minutes

    @property
    pickupDelay = 0.5; // Time before pickup enabled

    blockType: BlockType = BlockType.Air;
    quantity = 1;

    private age = 0;
    private initialY = 0;
    private canPickup = false;

    protected start(): void {
        this.initialY = this.node.position.y;
        this.scheduleOnce(() => {
            this.canPickup = true;
        }, this.pickupDelay);
    }

    protected update(dt: number): void {
        this.age += dt;

        // Bob up and down
        const bobOffset = Math.sin(this.age * this.bobSpeed) * this.bobHeight;
        const pos = this.node.position;
        this.node.setPosition(pos.x, this.initialY + bobOffset, pos.z);

        // Rotate
        const rot = this.node.eulerAngles;
        this.node.setRotationFromEuler(rot.x, rot.y + this.rotateSpeed * dt, rot.z);

        // Despawn check
        if (this.age >= this.despawnTime) {
            this.node.destroy();
        }
    }
}
