import { _decorator, Component, MeshRenderer, Node, physics, primitives, utils } from 'cc';

import { Chunk } from './chunk';
import { ChunkData } from './chunkData';
import { MeshData } from './meshData';
import { calculateNormals } from './utils/normalsAux';

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

    start(): void {}

    update(): void {}

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
        const landUvs = meshData.uv.flatMap(uv => [uv.x, uv.y]);
        const landNormals = calculateNormals(landVertices, meshData.triangles);

        const landGeometry: primitives.IGeometry = {
            positions: landVertices,
            indices: meshData.triangles,
            normals: landNormals,
            uvs: landUvs,
        };

        this.meshRender.mesh = utils.MeshUtils.createMesh(landGeometry);

        if (meshData.waterMesh) {
            const waterVertices = meshData.waterMesh.vertices.flatMap(v => [v.x, v.y, v.z]);
            const waterUvs = meshData.waterMesh.uv.flatMap(uv => [uv.x, uv.y]);
            const waterNormals = calculateNormals(waterVertices, meshData.waterMesh.triangles);

            const waterGeometry: primitives.IGeometry = {
                positions: waterVertices,
                indices: meshData.waterMesh.triangles,
                normals: waterNormals,
                uvs: waterUvs,
            };

            this.meshRenderWater.mesh = utils.MeshUtils.createMesh(waterGeometry);
        }

        const collisionVertices = meshData.collisionVertices.flatMap(v => [v.x, v.y, v.z]);
        const collisionGeometry: primitives.IGeometry = {
            positions: collisionVertices,
            indices: meshData.collisionTriangles,
        };
        this.meshCollider.mesh = utils.MeshUtils.createMesh(collisionGeometry);

        // if (this.showGizmo && this.chunkData) this.showDebugGizmo();
    }

    /*private showDebugGizmo(): void {
        const meshdata = Chunk.getMeshData(this.chunkData);
        const vertices = meshdata.collisionVertices;
        const numVertices = vertices.length;

        // Calculate the number of Line components needed
        // Adjusted this value, if Line component has many positions it will not render. 100 looks a threshold.
        const numComponents = Math.ceil(numVertices / 100);

        for (let i = 0; i < numComponents; i++) {
            let lineNode = this.node.getChildByName(`Line${i}`);
            if (!lineNode) {
                lineNode = new Node(`Line${i}`);
                this.debugNode.addChild(lineNode);
            }

            let line = lineNode.getComponent(Line);
            if (!line) {
                line = lineNode.addComponent(Line);
            }

            line.color = new GradientRange();
            line.color.color = Color.RED;
            line.width = new CurveRange();
            line.width.constant = 0.5;

            line.visibility = 1;
            line.enabled = true;

            line.positions = [];

            // Calculate the start and end indices for this component
            const start = i * 100;
            const end = Math.min((i + 1) * 100, numVertices);

            for (let j = start; j < end; j++) {
                const v = vertices[j];
                line.positions.push(v);
            }
        }
    }*/
}
