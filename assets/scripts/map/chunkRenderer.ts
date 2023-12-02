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

    mesh = new Mesh();
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
        const vertices = new Float32Array(
            meshData.vertices.concat(meshData.waterMesh.vertices).reduce((acc, v) => acc.concat([v.x, v.y, v.z]), [])
        );
        const triangles = new Uint16Array(
            meshData.triangles.concat(meshData.waterMesh.triangles.map((val: number) => val + meshData.vertices.length))
        );
        const uvs = new Float32Array(
            meshData.uv.concat(meshData.waterMesh.uv).reduce((acc, uv) => acc.concat([uv.x, uv.y]), [])
        );

        const geometry: primitives.IDynamicGeometry = {
            positions: vertices,
            indices16: triangles,
            uvs: uvs,
        };

        this.mesh = utils.MeshUtils.createDynamicMesh(0, geometry);
        this.meshRender.mesh = this.mesh;

        const collisionVertices = new Float32Array(
            meshData.collisionVertices.reduce((acc, v) => acc.concat([v.x, v.y, v.z]), [])
        );
        const collisionTriangles = new Uint16Array(meshData.collisionTriangles);

        const collisionGeometry: primitives.IDynamicGeometry = {
            positions: collisionVertices,
            indices16: collisionTriangles,
        };

        const collisionMesh = utils.MeshUtils.createDynamicMesh(0, collisionGeometry);
        this.meshCollider.mesh = collisionMesh;
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
