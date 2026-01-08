import { _decorator, Component, Mesh, MeshRenderer, Node, physics, primitives, utils } from 'cc';

import { BlockHelper } from './blockHelper';
import { Chunk } from './chunk';
import { ChunkData } from './chunkData';
import { MeshData } from './meshData';
import { calculateNormals } from './utils/normalsAux';

const { ccclass, type, property } = _decorator;

// Growth factor for dynamic mesh buffers (allow 50% extra for dig/build updates)
const BUFFER_GROWTH_FACTOR = 1.5;

/**
 * Calculate dynamic mesh options based on actual geometry size.
 * Adds headroom for future updates without over-allocating.
 */
function createDynamicMeshOptions(vertexCount: number, indexCount: number): primitives.ICreateDynamicMeshOptions {
    return {
        maxSubMeshes: 1,
        maxSubMeshVertices: Math.ceil(vertexCount * BUFFER_GROWTH_FACTOR),
        maxSubMeshIndices: Math.ceil(indexCount * BUFFER_GROWTH_FACTOR),
    };
}

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

    // Cached dynamic meshes for efficient updates (dig/build mechanics)
    private landMesh: Mesh | null = null;
    private waterMesh: Mesh | null = null;
    private collisionMesh: Mesh | null = null;

    // Track current buffer capacities to know when recreation is needed
    private landCapacity = { vertices: 0, indices: 0 };
    private waterCapacity = { vertices: 0, indices: 0 };
    private collisionCapacity = { vertices: 0, indices: 0 };

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
        this.renderMesh(Chunk.getMeshData(this.chunkData, BlockHelper));
    }

    updateChunkWithData(meshData: MeshData): void {
        this.renderMesh(meshData);
    }

    // Optimized: Accept pre-computed flat arrays directly from worker
    // Uses dynamic meshes for efficient dig/build mechanics updates
    updateChunkWithPureData(pure: import('./pure/pureMesh').PureMeshData): void {
        const VEC3_SIZE = 3;
        const landVertexCount = pure.vertices.length / VEC3_SIZE;
        const landIndexCount = pure.indices.length;

        const landGeometry: primitives.IDynamicGeometry = {
            positions: new Float32Array(pure.vertices),
            indices16: new Uint16Array(pure.indices),
            normals: new Float32Array(pure.normals),
            uvs: new Float32Array(pure.uvs),
        };

        this.updateLandMesh(landGeometry, landVertexCount, landIndexCount);

        // Handle water mesh
        if (pure.waterMesh && pure.waterMesh.vertices.length > 0) {
            const waterVertexCount = pure.waterMesh.vertices.length / VEC3_SIZE;
            const waterIndexCount = pure.waterMesh.indices.length;

            const waterGeometry: primitives.IDynamicGeometry = {
                positions: new Float32Array(pure.waterMesh.vertices),
                indices16: new Uint16Array(pure.waterMesh.indices),
                normals: new Float32Array(pure.waterMesh.normals),
                uvs: new Float32Array(pure.waterMesh.uvs),
            };

            this.updateWaterMesh(waterGeometry, waterVertexCount, waterIndexCount);
        }

        // Handle collision mesh
        if (pure.collisionVertices.length > 0) {
            const collisionVertexCount = pure.collisionVertices.length / VEC3_SIZE;
            const collisionIndexCount = pure.collisionIndices.length;

            const collisionGeometry: primitives.IDynamicGeometry = {
                positions: new Float32Array(pure.collisionVertices),
                indices16: new Uint16Array(pure.collisionIndices),
            };

            this.updateCollisionMesh(collisionGeometry, collisionVertexCount, collisionIndexCount);
        }
    }

    private renderMesh(meshData: MeshData): void {
        const VEC3_SIZE = 3;
        const landVertices = meshData.vertices.flatMap(v => [v.x, v.y, v.z]);
        const landUvs = meshData.uv.flatMap(uv => [uv.x, uv.y]);
        const landNormals = calculateNormals(landVertices, meshData.triangles);
        const landVertexCount = landVertices.length / VEC3_SIZE;
        const landIndexCount = meshData.triangles.length;

        const landGeometry: primitives.IDynamicGeometry = {
            positions: new Float32Array(landVertices),
            indices16: new Uint16Array(meshData.triangles),
            normals: new Float32Array(landNormals),
            uvs: new Float32Array(landUvs),
        };

        this.updateLandMesh(landGeometry, landVertexCount, landIndexCount);

        if (meshData.waterMesh) {
            const waterVertices = meshData.waterMesh.vertices.flatMap(v => [v.x, v.y, v.z]);
            const waterUvs = meshData.waterMesh.uv.flatMap(uv => [uv.x, uv.y]);
            const waterNormals = calculateNormals(waterVertices, meshData.waterMesh.triangles);
            const waterVertexCount = waterVertices.length / VEC3_SIZE;
            const waterIndexCount = meshData.waterMesh.triangles.length;

            const waterGeometry: primitives.IDynamicGeometry = {
                positions: new Float32Array(waterVertices),
                indices16: new Uint16Array(meshData.waterMesh.triangles),
                normals: new Float32Array(waterNormals),
                uvs: new Float32Array(waterUvs),
            };

            this.updateWaterMesh(waterGeometry, waterVertexCount, waterIndexCount);
        }

        const collisionVertices = meshData.collisionVertices.flatMap(v => [v.x, v.y, v.z]);
        const collisionVertexCount = collisionVertices.length / VEC3_SIZE;
        const collisionIndexCount = meshData.collisionTriangles.length;
        const collisionGeometry: primitives.IDynamicGeometry = {
            positions: new Float32Array(collisionVertices),
            indices16: new Uint16Array(meshData.collisionTriangles),
        };

        this.updateCollisionMesh(collisionGeometry, collisionVertexCount, collisionIndexCount);

        // if (this.showGizmo && this.chunkData) this.showDebugGizmo();
    }

    private updateLandMesh(geometry: primitives.IDynamicGeometry, vertexCount: number, indexCount: number): void {
        const exceedsCapacity = vertexCount > this.landCapacity.vertices || indexCount > this.landCapacity.indices;

        if (!this.landMesh || exceedsCapacity) {
            const options = createDynamicMeshOptions(vertexCount, indexCount);
            this.landMesh = utils.MeshUtils.createDynamicMesh(0, geometry, undefined, options);
            this.meshRender.mesh = this.landMesh;
            this.landCapacity.vertices = options.maxSubMeshVertices;
            this.landCapacity.indices = options.maxSubMeshIndices;
        } else {
            this.landMesh.updateSubMesh(0, geometry);
        }
    }

    private updateWaterMesh(geometry: primitives.IDynamicGeometry, vertexCount: number, indexCount: number): void {
        const exceedsCapacity = vertexCount > this.waterCapacity.vertices || indexCount > this.waterCapacity.indices;

        if (!this.waterMesh || exceedsCapacity) {
            const options = createDynamicMeshOptions(vertexCount, indexCount);
            this.waterMesh = utils.MeshUtils.createDynamicMesh(0, geometry, undefined, options);
            this.meshRenderWater.mesh = this.waterMesh;
            this.waterCapacity.vertices = options.maxSubMeshVertices;
            this.waterCapacity.indices = options.maxSubMeshIndices;
        } else {
            this.waterMesh.updateSubMesh(0, geometry);
        }
    }

    private updateCollisionMesh(geometry: primitives.IDynamicGeometry, vertexCount: number, indexCount: number): void {
        // Always recreate collision mesh for physics to detect changes
        // Dynamic mesh updateSubMesh might not trigger physics cooking update in all backends
        const options: primitives.ICreateDynamicMeshOptions = {
            maxSubMeshes: 1,
            maxSubMeshVertices: vertexCount,
            maxSubMeshIndices: indexCount,
        };

        const newMesh = utils.MeshUtils.createDynamicMesh(0, geometry, undefined, options);

        // Explicitly clear and set to force update
        // Toggle enabled to force physics system to refresh the shape
        this.meshCollider.enabled = false;
        this.meshCollider.mesh = newMesh;
        this.meshCollider.enabled = true;

        this.collisionMesh = newMesh;
        this.collisionCapacity.vertices = vertexCount;
        this.collisionCapacity.indices = indexCount;
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
