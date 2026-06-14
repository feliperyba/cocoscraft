import { _decorator, Camera, Color, Component, Material, MeshRenderer, Node, primitives, Quat, utils, Vec3 } from 'cc';

import { BlockType } from '../map/models';
import { World } from '../map/world';
import { BlockRaycaster } from './BlockRaycaster';

const { ccclass, property, type } = _decorator;

@ccclass('BlockHighlight')
export class BlockHighlight extends Component {
    @property(Node)
    highlightCube!: Node;

    @type(BlockRaycaster)
    raycaster!: BlockRaycaster;

    @type(World)
    world!: World;

    @type(Camera)
    camera!: Camera;

    private buildPreviewCube!: Node;

    start(): void {
        if (!this.highlightCube) {
            this.highlightCube = this.createCube('HighlightCube', new Color(0, 255, 255, 120));
        }

        this.buildPreviewCube = this.createCube('BuildPreviewCube', new Color(100, 255, 100, 60));
    }

    protected onLoad(): void {
        const result = this.node.scene!.getChildByPath('WorldManager');
        if (result) {
            this.world = result.getComponent(World)!;
        }
    }

    private createCube(name: string, color: Color): Node {
        const node = new Node(name);

        if (this.node.scene) {
            this.node.scene.addChild(node);
        } else {
            this.node.addChild(node);
        }

        const meshRenderer = node.addComponent(MeshRenderer);
        const mesh = utils.MeshUtils.createMesh(primitives.box({ width: 1.01, height: 1.01, length: 1.01 }));
        meshRenderer.mesh = mesh;

        const material = new Material();
        material.initialize({ effectName: 'builtin-unlit', technique: 1 });
        meshRenderer.material = material;
        material.setProperty('mainColor', color);

        node.active = false;
        return node;
    }

    update(): void {
        const hit = this.raycaster.raycastBlock(this.camera, this.world);

        if (hit && hit.blockType !== BlockType.Air && hit.blockType !== BlockType.Empty) {
            this.highlightCube.active = true;
            this.highlightCube.setWorldPosition(hit.blockWorldPosition);
            this.highlightCube.setWorldRotation(Quat.IDENTITY);

            const placePos = new Vec3(
                hit.blockWorldPosition.x + hit.hitNormal.x,
                hit.blockWorldPosition.y + hit.hitNormal.y,
                hit.blockWorldPosition.z + hit.hitNormal.z,
            );
            this.buildPreviewCube.active = true;
            this.buildPreviewCube.setWorldPosition(placePos);
            this.buildPreviewCube.setWorldRotation(Quat.IDENTITY);
        } else {
            this.highlightCube.active = false;

            const airTarget = this.raycaster.getAirPlacementTarget(this.camera, this.world);
            if (airTarget) {
                this.buildPreviewCube.active = true;
                this.buildPreviewCube.setWorldPosition(airTarget);
                this.buildPreviewCube.setWorldRotation(Quat.IDENTITY);
            } else {
                this.buildPreviewCube.active = false;
            }
        }
    }
}
