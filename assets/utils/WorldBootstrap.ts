import { _decorator, Canvas, Color, Component, director, Label, Node, Sprite, UITransform } from 'cc';

import { World } from '../scripts/map/world';

const { ccclass } = _decorator;

@ccclass('WorldBootstrap')
export class WorldBootstrap extends Component {
    start(): void {
        this.startLoading().catch(err => console.error('WorldBootstrap:', err));
    }

    private async startLoading(): Promise<void> {
        const scene = director.getScene()!;
        const worldNode = scene.getChildByName('WorldManager');

        const world = worldNode?.getComponent(World);

        if (!world) {
            console.error('WorldBootstrap: Missing WorldManager node');
            return;
        }

        const generateBtn = scene.getChildByPath('Canvas/Generate');
        if (generateBtn) generateBtn.active = false;

        const overlay = this.createLoadingOverlay();

        await world.generateWorld(undefined, undefined, true);

        this.scheduleOnce(() => {
            overlay.active = false;
            if (generateBtn) generateBtn.active = true;
        }, 0.5);
    }

    private createLoadingOverlay(): Node {
        const scene = director.getScene()!;
        const canvas = scene.getComponentInChildren(Canvas);

        const overlay = new Node('LoadingOverlay');
        if (canvas) {
            canvas.node.addChild(overlay);
            overlay.layer = canvas.node.layer;
        } else {
            scene.addChild(overlay);
        }

        const bgTransform = overlay.addComponent(UITransform);
        bgTransform.setContentSize(9999, 9999);

        const bgSprite = overlay.addComponent(Sprite);
        bgSprite.color = new Color(15, 15, 20, 245);
        bgSprite.sizeMode = Sprite.SizeMode.CUSTOM;

        const labelNode = new Node('LoadingLabel');
        overlay.addChild(labelNode);
        labelNode.layer = overlay.layer;
        labelNode.setPosition(0, 0, 0);

        const labelTransform = labelNode.addComponent(UITransform);
        labelTransform.setContentSize(400, 60);

        const label = labelNode.addComponent(Label);
        label.string = 'Generating World...';
        label.fontSize = 32;
        label.color = new Color(255, 255, 255, 255);
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.overflow = Label.Overflow.NONE;

        return overlay;
    }
}
