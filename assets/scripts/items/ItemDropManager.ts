import { _decorator, Component, instantiate, Node, Prefab, RigidBody, Vec3 } from 'cc';

import { ItemDrop, ItemDropConfig } from './ItemDrop';

const { ccclass, type } = _decorator;

@ccclass('ItemDropManager')
export class ItemDropManager extends Component {
    @type(Prefab)
    itemDropPrefab!: Prefab;

    @type(Node)
    itemsContainer!: Node; // Parent node for all drops

    private static instance: ItemDropManager;

    protected onLoad(): void {
        ItemDropManager.instance = this;
    }

    static spawnDrop(config: ItemDropConfig): void {
        if (!this.instance) return;

        if (!this.instance.itemDropPrefab || !this.instance.itemsContainer) {
            console.warn('ItemDropManager not initialized properly');
            return;
        }

        const dropNode = instantiate(this.instance.itemDropPrefab);
        dropNode.setPosition(config.position.x + 0.5, config.position.y + 0.5, config.position.z + 0.5);

        const itemDrop = dropNode.getComponent(ItemDrop);
        if (itemDrop) {
            itemDrop.blockType = config.blockType;
            itemDrop.quantity = config.quantity;
        }

        // Add physics for initial bounce
        const rb = dropNode.getComponent(RigidBody);
        if (rb && config.velocity) {
            rb.setLinearVelocity(config.velocity);
        } else if (rb) {
            // Random upward velocity
            rb.setLinearVelocity(new Vec3((Math.random() - 0.5) * 2, 3, (Math.random() - 0.5) * 2));
        }

        this.instance.itemsContainer.addChild(dropNode);
    }
}
