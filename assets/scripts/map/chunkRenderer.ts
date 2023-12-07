import { _decorator, Color, Component, Graphics, MeshRenderer, Node, physics, primitives, utils, Vec3 } from 'cc';

import { Chunk } from './chunk';
import { ChunkData } from './chunkData';
import { MeshData } from './meshData';

const { ccclass, type, property } = _decorator;

@ccclass('ChunkRenderer')
export class ChunkRenderer extends Component {
    @property(Node)
    debugNode!: Node;

    @property
    showGizmo = false;

    @type(physics.MeshCollider)
    meshCollider!: physics.MeshCollider;

    @type(MeshRenderer)
    meshRender!: MeshRenderer;

    @type(MeshRenderer)
    meshRenderWater!: MeshRenderer;

    chunkData!: ChunkData;

    start(): void {
        const graphics = this.debugNode.getComponent(Graphics);
        if (!graphics) {
            this.debugNode.addComponent(Graphics);
        }
    }

    update(): void {
        if (this.showGizmo && this.chunkData) this.showDebugGizmo();
    }

    setIsModified(value: boolean): void {
        this.chunkData.isModified = value;
    }

    isModified(): boolean {
        return this.chunkData.isModified;
    }

    initChunk(chunkData: ChunkData): void {
        this.chunkData = chunkData;
    }

    updateChunk(): void {
        this.renderMesh(Chunk.getMeshData(this.chunkData));
    }

    updateChunkWithData(meshData: MeshData): void {
        this.renderMesh(meshData);
    }

    private renderMesh(meshData: MeshData): void {
        const landVertices = meshData.vertices.flatMap(v => [v.x, v.y, v.z]);
        const landTriangles = meshData.triangles;
        const landUvs = meshData.uv.flatMap(uv => [uv.x, uv.y]);
        const landGeometry: primitives.IGeometry = {
            positions: landVertices,
            indices: landTriangles,
            uvs: landUvs,
        };

        this.meshRender.mesh = utils.MeshUtils.createMesh(landGeometry);

        if (meshData.waterMesh) {
            const waterVertices = meshData.waterMesh.vertices.flatMap(v => [v.x, v.y, v.z]);
            const waterTriangles = meshData.waterMesh.triangles;
            const waterUvs = meshData.waterMesh.uv.flatMap(uv => [uv.x, uv.y]);
            const waterGeometry: primitives.IGeometry = {
                positions: waterVertices,
                indices: waterTriangles,
                uvs: waterUvs,
            };

            this.meshRenderWater.mesh = utils.MeshUtils.createMesh(waterGeometry);
        }

        const collisionVertices = meshData.collisionVertices.flatMap(v => [v.x, v.y, v.z]);
        const collisionGeometry: primitives.IGeometry = {
            positions: collisionVertices,
            indices: meshData.collisionTriangles,
        };

        this.meshCollider.mesh = utils.MeshUtils.createMesh(collisionGeometry, this.meshCollider.mesh);
    }

    private showDebugGizmo(): void {
        const graphics = this.debugNode.getComponent(Graphics);
        graphics.clear();

        const position = this.node.position
            .clone()
            .add(new Vec3(this.chunkData.chunkSize / 2, this.chunkData.chunkHeight / 2, this.chunkData.chunkSize / 2));
        const size = new Vec3(this.chunkData.chunkSize, this.chunkData.chunkHeight, this.chunkData.chunkSize);

        // Draw the cube
        graphics.lineWidth = 2.5;
        graphics.strokeColor = Color.RED;
        graphics.moveTo(position.x - size.x / 2, position.y - size.y / 2);
        graphics.lineTo(position.x + size.x / 2, position.y - size.y / 2);
        graphics.lineTo(position.x + size.x / 2, position.y + size.y / 2);
        graphics.lineTo(position.x - size.x / 2, position.y + size.y / 2);
        graphics.close();
        graphics.stroke();
    }
}
