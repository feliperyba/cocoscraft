import { _decorator, Camera, Color, Component, Material, MeshRenderer, Node, primitives, Quat, utils } from 'cc';

import { BlockType } from '../map/models';
import { World } from '../map/world';
import { BlockRaycaster } from './BlockRaycaster';

const { ccclass, property, type } = _decorator;

@ccclass('BlockHighlight')
export class BlockHighlight extends Component {
    @property(Node)
    highlightCube!: Node; // Wireframe cube prefab

    @type(BlockRaycaster)
    raycaster!: BlockRaycaster;

    @type(World)
    world!: World;

    @type(Camera)
    camera!: Camera;

    start(): void {
        if (!this.highlightCube) {
            this.createDefaultHighlight();
        }
    }

    protected onLoad(): void {
        const result = this.node.scene!.getChildByPath('WorldManager');
        if (result) {
            this.world = result.getComponent(World)!;
        }
    }

    private createDefaultHighlight(): void {
        // Create a node for the highlight
        this.highlightCube = new Node('HighlightCube');

        if (this.node.scene) {
            this.node.scene.addChild(this.highlightCube);
        } else {
            this.node.addChild(this.highlightCube);
        }

        // Add mesh renderer
        const meshRenderer = this.highlightCube.addComponent(MeshRenderer);

        const size = 1.01;
        const mesh = utils.MeshUtils.createMesh(primitives.box({ width: size, height: size, length: size }));
        meshRenderer.mesh = mesh;
        const material = new Material();
        material.initialize({
            effectName: 'builtin-unlit',
            technique: 1,
        });

        meshRenderer.material = material;

        // Set color to semi-transparent white/cyan
        const alpha = 100;
        const color = new Color(0, 255, 255, alpha); // Cyan highlight

        // For unlit, property is usually 'mainColor'
        material.setProperty('mainColor', color);

        this.highlightCube.active = false;
    }

    update(): void {
        const hit = this.raycaster.raycastBlock(this.camera, this.world);

        if (hit && hit.blockType !== BlockType.Air && hit.blockType !== BlockType.Empty) {
            this.highlightCube.active = true;
            this.highlightCube.setWorldPosition(
                hit.blockWorldPosition.x,
                hit.blockWorldPosition.y,
                hit.blockWorldPosition.z
            );
            this.highlightCube.setWorldRotation(Quat.IDENTITY);
        } else {
            this.highlightCube.active = false;
        }
    }
}
