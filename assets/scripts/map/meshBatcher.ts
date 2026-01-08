import { Mesh, MeshRenderer, Node, primitives, utils } from 'cc';

import { PureMeshData } from './pure/pureMesh';

/**
 * Batches multiple chunk meshes into combined draw calls.
 * Reduces draw call overhead by merging nearby chunks.
 *
 * Usage:
 * ```
 * const meshesToBatch = chunks.map(c => ({
 *     mesh: c.meshData,
 *     offsetX: c.worldPosition.x,
 *     offsetY: c.worldPosition.y,
 *     offsetZ: c.worldPosition.z
 * }));
 * const batches = MeshBatcher.batchMeshes(meshesToBatch);
 * batches.forEach(batch => MeshBatcher.applyBatchToRenderer(batch, renderer));
 * ```
 */
export class MeshBatcher {
    // Maximum vertices per batch (WebGL has 65535 index limit for 16-bit indices)
    private static readonly maxVerticesPerBatch = 60000;
    private static readonly maxIndicesPerBatch = 180000;
    private static readonly vec3Size = 3;

    /**
     * Combines multiple PureMeshData into batched meshes.
     * Returns array of batched mesh data with world offsets applied.
     */
    static batchMeshes(
        meshes: { mesh: PureMeshData; offsetX: number; offsetY: number; offsetZ: number }[]
    ): PureMeshData[] {
        const batches: PureMeshData[] = [];
        let currentBatch = this.createEmptyBatch();
        let currentVertexCount = 0;
        let currentIndexCount = 0;

        for (const { mesh, offsetX, offsetY, offsetZ } of meshes) {
            const meshVertexCount = mesh.vertices.length / this.vec3Size;
            const meshIndexCount = mesh.indices.length;

            // Check if adding this mesh would exceed batch limits
            if (
                currentVertexCount + meshVertexCount > this.maxVerticesPerBatch ||
                currentIndexCount + meshIndexCount > this.maxIndicesPerBatch
            ) {
                // Save current batch and start new one
                if (currentBatch.vertices.length > 0) {
                    batches.push(currentBatch);
                }
                currentBatch = this.createEmptyBatch();
                currentVertexCount = 0;
                currentIndexCount = 0;
            }

            // Add mesh to current batch with offset
            this.addMeshToBatch(currentBatch, mesh, offsetX, offsetY, offsetZ, currentVertexCount);
            currentVertexCount += meshVertexCount;
            currentIndexCount += meshIndexCount;
        }

        // Don't forget the last batch
        if (currentBatch.vertices.length > 0) {
            batches.push(currentBatch);
        }

        return batches;
    }

    private static createEmptyBatch(): PureMeshData {
        return {
            vertices: [],
            indices: [],
            uvs: [],
            normals: [],
            collisionVertices: [],
            collisionIndices: [],
        };
    }

    private static addMeshToBatch(
        batch: PureMeshData,
        mesh: PureMeshData,
        offsetX: number,
        offsetY: number,
        offsetZ: number,
        baseVertexIndex: number
    ): void {
        const IDX_Y = 1;
        const IDX_Z = 2;

        // Add vertices with world offset
        for (let i = 0; i < mesh.vertices.length; i += this.vec3Size) {
            batch.vertices.push(
                mesh.vertices[i] + offsetX,
                mesh.vertices[i + IDX_Y] + offsetY,
                mesh.vertices[i + IDX_Z] + offsetZ
            );
        }

        // Add indices with offset
        for (const idx of mesh.indices) {
            batch.indices.push(idx + baseVertexIndex);
        }

        // Copy UVs directly (no offset needed)
        batch.uvs.push(...mesh.uvs);

        // Copy normals directly (no offset needed)
        batch.normals.push(...mesh.normals);

        // Add collision vertices with world offset
        const baseCollisionVertexIndex = batch.collisionVertices.length / this.vec3Size;
        for (let i = 0; i < mesh.collisionVertices.length; i += this.vec3Size) {
            batch.collisionVertices.push(
                mesh.collisionVertices[i] + offsetX,
                mesh.collisionVertices[i + IDX_Y] + offsetY,
                mesh.collisionVertices[i + IDX_Z] + offsetZ
            );
        }

        // Add collision indices with offset
        for (const idx of mesh.collisionIndices) {
            batch.collisionIndices.push(idx + baseCollisionVertexIndex);
        }

        // Handle water mesh if present
        if (mesh.waterMesh && mesh.waterMesh.vertices.length > 0) {
            if (!batch.waterMesh) {
                batch.waterMesh = this.createEmptyBatch();
            }
            const baseWaterVertexIndex = batch.waterMesh.vertices.length / this.vec3Size;
            this.addMeshToBatch(batch.waterMesh, mesh.waterMesh, offsetX, offsetY, offsetZ, baseWaterVertexIndex);
        }
    }

    // Growth factor for dynamic mesh buffers (allow 50% extra for updates)
    private static readonly bufferGrowthFactor = 1.5;

    /**
     * Creates or updates a dynamic mesh from batched PureMeshData.
     * Calculates buffer size based on actual geometry with growth headroom.
     * @param batch The batched mesh data
     * @param meshRenderer The renderer to apply the mesh to
     * @param existingMesh Optional existing mesh to update instead of creating new
     * @param currentCapacity Optional current capacity to check if recreation needed
     * @returns Object containing the mesh and its capacity
     */
    static applyBatchToRenderer(
        batch: PureMeshData,
        meshRenderer: MeshRenderer,
        existingMesh?: Mesh | null,
        currentCapacity?: { vertices: number; indices: number }
    ): { mesh: Mesh; capacity: { vertices: number; indices: number } } {
        const vertexCount = batch.vertices.length / this.vec3Size;
        const indexCount = batch.indices.length;

        const geometry: primitives.IDynamicGeometry = {
            positions: new Float32Array(batch.vertices),
            indices16: new Uint16Array(batch.indices),
            normals: new Float32Array(batch.normals),
            uvs: new Float32Array(batch.uvs),
        };

        // Check if existing mesh can handle the new data
        const hasExisting = existingMesh && currentCapacity;
        const vertexFits = currentCapacity && vertexCount <= currentCapacity.vertices;
        const indexFits = currentCapacity && indexCount <= currentCapacity.indices;

        if (hasExisting && vertexFits && indexFits) {
            existingMesh.updateSubMesh(0, geometry);
            return { mesh: existingMesh, capacity: currentCapacity };
        }

        // Calculate new capacity with growth headroom
        const newCapacity = {
            vertices: Math.ceil(vertexCount * this.bufferGrowthFactor),
            indices: Math.ceil(indexCount * this.bufferGrowthFactor),
        };

        const options: primitives.ICreateDynamicMeshOptions = {
            maxSubMeshes: 1,
            maxSubMeshVertices: newCapacity.vertices,
            maxSubMeshIndices: newCapacity.indices,
        };
        const mesh = utils.MeshUtils.createDynamicMesh(0, geometry, undefined, options);
        meshRenderer.mesh = mesh;
        return { mesh, capacity: newCapacity };
    }
}

/**
 * Interface for tracking batched chunk groups.
 */
export interface ChunkBatchGroup {
    // Unique ID for this batch group
    batchId: number;
    // World position of batch origin (usually first chunk)
    originX: number;
    originY: number;
    originZ: number;
    // Chunk positions included in this batch
    chunkPositions: number[]; // parseVec3ToInt values
    // The batched mesh data
    batchedMesh: PureMeshData | null;
    // Node containing the batched mesh renderer
    batchNode: Node | null;
    // Dirty flag for rebatching
    isDirty: boolean;
}
