import { _decorator, Component, Graphics, Node, UITransform, view, Canvas, Color } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('Crosshair')
export class Crosshair extends Component {
    @property
    size = 20;

    @property
    thickness = 2;

    @property
    gap = 4;

    start(): void {
        this.createCrosshair();
        view.on('canvas-resize', this.onResize, this);
    }

    private createCrosshair(): void {
        const scene = this.node.scene;
        if (!scene) return;

        let canvas = scene.getComponentInChildren(Canvas);
        if (!canvas) {
            const canvasNode = new Node('CrosshairCanvas');
            scene.addChild(canvasNode);
            canvas = canvasNode.addComponent(Canvas);
        }

        const node = new Node('Crosshair');
        canvas.node.addChild(node);

        const uiTransform = node.addComponent(UITransform);
        uiTransform.setContentSize(this.size * 2, this.size * 2);

        const g = node.addComponent(Graphics);

        node.layer = canvas.node.layer;

        const half = this.size / 2;
        const t = this.thickness / 2;
        const c = new Color(255, 255, 255, 200);

        g.fillColor = c;
        g.strokeColor = c;

        g.rect(-t, this.gap, this.thickness, half - this.gap);
        g.fill();
        g.rect(-t, -half, this.thickness, half - this.gap);
        g.fill();
        g.rect(this.gap, -t, half - this.gap, this.thickness);
        g.fill();
        g.rect(-half, -t, half - this.gap, this.thickness);
        g.fill();

        node.setPosition(0, 0, 0);
    }

    private onResize(): void {
    }

    onDestroy(): void {
        view.off('canvas-resize', this.onResize, this);
    }}
