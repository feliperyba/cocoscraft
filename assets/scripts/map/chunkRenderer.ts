import { _decorator, Color, Component, Graphics, Mesh, MeshRenderer, Node, physics, primitives, utils, Vec3 } from 'cc';

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

    mesh = new Mesh();
    waterMesh = new Mesh();
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
        const vertices = meshData.vertices.concat(meshData.waterMesh?.vertices || []).flatMap(v => [v.x, v.y, v.z]);
        const triangles = meshData.triangles.concat(
            meshData.waterMesh?.triangles.map((val: number) => val + meshData.vertices.length) || []
        );
        const uvs = meshData.uv.concat(meshData.waterMesh?.uv || []).flatMap(uv => [uv.x, uv.y]);
        const geometry: primitives.IGeometry = {
            positions: vertices,
            indices: triangles,
            uvs: uvs,
        };

        utils.MeshUtils.createMesh(geometry, this.mesh);
        this.meshRender.mesh = this.mesh;

        const collisionVertices = meshData.collisionVertices.flatMap(v => [v.x, v.y, v.z]);
        const collisionGeometry: primitives.IGeometry = {
            positions: collisionVertices,
            indices: meshData.collisionTriangles,
        };

        utils.MeshUtils.createMesh(collisionGeometry, this.meshCollider.mesh);
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
