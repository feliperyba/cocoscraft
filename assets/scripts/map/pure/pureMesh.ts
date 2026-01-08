// Pure Mesh Generation Logic
// Designed to run in a worker, no 'cc' imports allowed
export interface Vec2Like {
    x: number;
    y: number;
}

export interface Vec3Like {
    x: number;
    y: number;
    z: number;
}

export enum BlockDirection {
    Forward = 0, // z+
    Back = 1, // z-
    Up = 2, // y+
    Down = 3, // y-
    Right = 4, // x+
    Left = 5, // x-
}

export interface BlockDefinition {
    blockType: number;
    isSolid: boolean;
    generatesCollider: boolean;
    up: Vec2Like;
    down: Vec2Like;
    side: Vec2Like;
}

export interface MeshGenerationConfig {
    blocks: number[];
    chunkSize: number;
    chunkHeight: number;
    tileSizeX: number;
    tileSizeY: number;
    textureOffset: number;
    blockDefinitions: Record<number, BlockDefinition>;
    neighborRight?: number[];
    neighborLeft?: number[];
    neighborUp?: number[];
    neighborDown?: number[];
    neighborForward?: number[];
    neighborBack?: number[];
}

export interface PureMeshData {
    vertices: number[]; // x,y,z flattened
    indices: number[];
    uvs: number[]; // u,v flattened
    normals: number[]; // x,y,z flattened - pre-calculated in worker
    collisionVertices: number[];
    collisionIndices: number[];
    waterMesh?: PureMeshData;
}

/* eslint-disable complexity */
export const generateChunkMeshPure = (config: MeshGenerationConfig): PureMeshData => {
    // Constants (Moved inside for worker portability)
    const HALF_BLOCK = 0.5;
    const NEG_HALF_BLOCK = -0.5;
    const VEC3_SIZE = 3;
    const IDX_0 = 0;
    const IDX_1 = 1;
    const IDX_2 = 2;
    const IDX_3 = 3;

    const calculateNormals = (vertices: number[], indices: number[]): number[] => {
        const normals = new Array(vertices.length).fill(0);

        for (let i = 0; i < indices.length; i += VEC3_SIZE) {
            const v0 = indices[i] * VEC3_SIZE;
            const v1 = indices[i + 1] * VEC3_SIZE;
            const v2 = indices[i + 2] * VEC3_SIZE;

            const p0x = vertices[v0];
            const p0y = vertices[v0 + 1];
            const p0z = vertices[v0 + 2];
            const p1x = vertices[v1];
            const p1y = vertices[v1 + 1];
            const p1z = vertices[v1 + 2];
            const p2x = vertices[v2];
            const p2y = vertices[v2 + 1];
            const p2z = vertices[v2 + 2];

            const edge1x = p1x - p0x;
            const edge1y = p1y - p0y;
            const edge1z = p1z - p0z;
            const edge2x = p2x - p0x;
            const edge2y = p2y - p0y;
            const edge2z = p2z - p0z;

            // Cross product
            const nx = edge1y * edge2z - edge1z * edge2y;
            const ny = edge1z * edge2x - edge1x * edge2z;
            const nz = edge1x * edge2y - edge1y * edge2x;

            normals[v0] += nx;
            normals[v0 + 1] += ny;
            normals[v0 + 2] += nz;
            normals[v1] += nx;
            normals[v1 + 1] += ny;
            normals[v1 + 2] += nz;
            normals[v2] += nx;
            normals[v2 + 1] += ny;
            normals[v2 + 2] += nz;
        }

        // Normalize
        for (let i = 0; i < normals.length; i += VEC3_SIZE) {
            const x = normals[i];
            const y = normals[i + 1];
            const z = normals[i + 2];
            const len = Math.sqrt(x * x + y * y + z * z);
            if (len > 0) {
                normals[i] = x / len;
                normals[i + 1] = y / len;
                normals[i + 2] = z / len;
            }
        }

        return normals;
    };
    // BlockType values must match models/blocks.ts enum
    const BLOCK_AIR = 1;
    const BLOCK_WATER = 7;

    // Directions Enum Simulation
    const directions = {
        forward: 0,
        back: 1,
        up: 2,
        down: 3,
        right: 4,
        left: 5,
    };

    // Lookup tables to reduce complexity
    // Order: Forward(0), Back(1), Up(2), Down(3), Right(4), Left(5)
    const vertexLookups = [
        // Forward (z+)
        [
            [HALF_BLOCK, NEG_HALF_BLOCK, HALF_BLOCK],
            [HALF_BLOCK, HALF_BLOCK, HALF_BLOCK],
            [NEG_HALF_BLOCK, HALF_BLOCK, HALF_BLOCK],
            [NEG_HALF_BLOCK, NEG_HALF_BLOCK, HALF_BLOCK],
        ],
        // Back (z-)
        [
            [NEG_HALF_BLOCK, NEG_HALF_BLOCK, NEG_HALF_BLOCK],
            [NEG_HALF_BLOCK, HALF_BLOCK, NEG_HALF_BLOCK],
            [HALF_BLOCK, HALF_BLOCK, NEG_HALF_BLOCK],
            [HALF_BLOCK, NEG_HALF_BLOCK, NEG_HALF_BLOCK],
        ],
        // Up (y+)
        [
            [NEG_HALF_BLOCK, HALF_BLOCK, HALF_BLOCK],
            [HALF_BLOCK, HALF_BLOCK, HALF_BLOCK],
            [HALF_BLOCK, HALF_BLOCK, NEG_HALF_BLOCK],
            [NEG_HALF_BLOCK, HALF_BLOCK, NEG_HALF_BLOCK],
        ],
        // Down (y-)
        [
            [NEG_HALF_BLOCK, NEG_HALF_BLOCK, NEG_HALF_BLOCK],
            [HALF_BLOCK, NEG_HALF_BLOCK, NEG_HALF_BLOCK],
            [HALF_BLOCK, NEG_HALF_BLOCK, HALF_BLOCK],
            [NEG_HALF_BLOCK, NEG_HALF_BLOCK, HALF_BLOCK],
        ],
        // Right (x+)
        [
            [HALF_BLOCK, NEG_HALF_BLOCK, NEG_HALF_BLOCK],
            [HALF_BLOCK, HALF_BLOCK, NEG_HALF_BLOCK],
            [HALF_BLOCK, HALF_BLOCK, HALF_BLOCK],
            [HALF_BLOCK, NEG_HALF_BLOCK, HALF_BLOCK],
        ],
        // Left (x-)
        [
            [NEG_HALF_BLOCK, NEG_HALF_BLOCK, HALF_BLOCK],
            [NEG_HALF_BLOCK, HALF_BLOCK, HALF_BLOCK],
            [NEG_HALF_BLOCK, HALF_BLOCK, NEG_HALF_BLOCK],
            [NEG_HALF_BLOCK, NEG_HALF_BLOCK, NEG_HALF_BLOCK],
        ],
    ];

    /**
     * Adds a quad to the mesh data
     */
    const addQuad = (
        mesh: PureMeshData,
        x: number,
        y: number,
        z: number,
        dir: number,
        blockDef: BlockDefinition,
        tileSizeX: number,
        tileSizeY: number,
        textureOffset: number
    ): void => {
        const v = vertexLookups[dir];

        const startIndex = mesh.vertices.length / VEC3_SIZE;
        mesh.indices.push(
            startIndex,
            startIndex + IDX_1,
            startIndex + IDX_2,
            startIndex,
            startIndex + IDX_2,
            startIndex + IDX_3
        );

        for (let i = 0; i < v.length; i++) {
            const vert = v[i];
            mesh.vertices.push(x + vert[IDX_0], y + vert[IDX_1], z + vert[IDX_2]);
        }

        // Collision Mesh Generation
        // Water usually doesn't generate collider, but logic handles it if defined
        if (blockDef.generatesCollider) {
            const startColIndex = mesh.collisionVertices.length / VEC3_SIZE;
            mesh.collisionIndices.push(
                startColIndex,
                startColIndex + IDX_1,
                startColIndex + IDX_2,
                startColIndex,
                startColIndex + IDX_2,
                startColIndex + IDX_3
            );
            for (let i = 0; i < v.length; i++) {
                const vert = v[i];
                mesh.collisionVertices.push(x + vert[IDX_0], y + vert[IDX_1], z + vert[IDX_2]);
            }
        }

        let tilePos = blockDef.side;
        if (dir === directions.up) tilePos = blockDef.up;
        if (dir === directions.down) tilePos = blockDef.down;

        const u0 = tileSizeX * tilePos.x + textureOffset;
        const v0 = tileSizeY * tilePos.y + textureOffset;
        const u1 = tileSizeX * tilePos.x + tileSizeX - textureOffset;
        const v1 = tileSizeY * tilePos.y + tileSizeY - textureOffset;

        // UV order must match blockHelper.ts faceUVs: TL, BL, BR, TR
        mesh.uvs.push(
            u0,
            v1, // TL (vertex 0)
            u0,
            v0, // BL (vertex 1)
            u1,
            v0, // BR (vertex 2)
            u1,
            v1 // TR (vertex 3)
        );
    };

    const { blocks, chunkSize, chunkHeight, tileSizeX, tileSizeY, textureOffset, blockDefinitions } = config;

    // Helper functions
    const getBlock = (x: number, y: number, z: number): number => {
        if (x < 0 || x >= chunkSize || y < 0 || y >= chunkHeight || z < 0 || z >= chunkSize) {
            return 0; // Empty
        }
        return blocks[x + y * chunkSize + z * chunkSize * chunkHeight];
    };

    // Extract neighbor arrays from config
    const { neighborRight, neighborLeft, neighborForward, neighborBack } = config;

    // Helper to get block from neighbor chunk edge data
    // Neighbor arrays store a 2D slice: index = y * chunkSize + (perpendicular coord)
    const getBlockFromNeighbor = (neighborData: number[] | undefined, y: number, perpCoord: number): number => {
        if (!neighborData || y < 0 || y >= chunkHeight) {
            return y < 0 ? 0 : BLOCK_AIR;
        }
        const idx = y * chunkSize + perpCoord;
        return neighborData[idx] ?? BLOCK_AIR;
    };

    const getNeighborBlock = (x: number, y: number, z: number, dirVal: number[]): number => {
        const nx = x + dirVal[IDX_0];
        const ny = y + dirVal[IDX_1];
        const nz = z + dirVal[IDX_2];

        // Check if in bounds
        const inBoundsX = nx >= 0 && nx < chunkSize;
        const inBoundsY = ny >= 0 && ny < chunkHeight;
        const inBoundsZ = nz >= 0 && nz < chunkSize;

        if (inBoundsX && inBoundsY && inBoundsZ) {
            return blocks[nx + ny * chunkSize + nz * chunkSize * chunkHeight];
        }

        // Out of bounds - check neighbor chunk data if available
        // Y out of bounds
        if (ny < 0) {
            return 0; // Empty - solid below, don't draw
        }
        if (ny >= chunkHeight) {
            return BLOCK_AIR; // Air above
        }

        // X out of bounds - check right/left neighbors
        if (nx >= chunkSize) {
            return getBlockFromNeighbor(neighborRight, ny, nz);
        }
        if (nx < 0) {
            return getBlockFromNeighbor(neighborLeft, ny, nz);
        }

        // Z out of bounds - check forward/back neighbors
        if (nz >= chunkSize) {
            return getBlockFromNeighbor(neighborForward, ny, nx);
        }
        if (nz < 0) {
            return getBlockFromNeighbor(neighborBack, ny, nx);
        }

        return BLOCK_AIR; // Fallback
    };

    const mainMesh: PureMeshData = {
        vertices: [],
        indices: [],
        uvs: [],
        normals: [],
        collisionVertices: [],
        collisionIndices: [],
    };
    const waterMesh: PureMeshData = {
        vertices: [],
        indices: [],
        uvs: [],
        normals: [],
        collisionVertices: [],
        collisionIndices: [],
    };

    const dirs = [
        { dir: directions.forward, vec: [0, 0, 1] },
        { dir: directions.back, vec: [0, 0, -1] },
        { dir: directions.up, vec: [0, 1, 0] },
        { dir: directions.down, vec: [0, -1, 0] },
        { dir: directions.right, vec: [1, 0, 0] },
        { dir: directions.left, vec: [-1, 0, 0] },
    ];

    for (let x = 0; x < chunkSize; x++) {
        for (let y = 0; y < chunkHeight; y++) {
            for (let z = 0; z < chunkSize; z++) {
                const blockType = getBlock(x, y, z);
                if (blockType === 0 || blockType === BLOCK_AIR) continue;

                const def = blockDefinitions[blockType];
                if (!def) continue;

                const isWater = blockType === BLOCK_WATER;

                for (let i = 0; i < dirs.length; i++) {
                    const { dir, vec } = dirs[i];
                    const neighborType = getNeighborBlock(x, y, z, vec);
                    const neighborDef = blockDefinitions[neighborType];
                    const isNeighbourSolid = neighborDef ? neighborDef.isSolid : false;

                    if (isWater && neighborType === BLOCK_AIR) {
                        addQuad(waterMesh, x, y, z, dir, def, tileSizeX, tileSizeY, textureOffset);
                    }

                    const isVisibleBoundary = neighborType !== 0 && !isNeighbourSolid;

                    if (!isWater && isVisibleBoundary) {
                        addQuad(mainMesh, x, y, z, dir, def, tileSizeX, tileSizeY, textureOffset);
                    }
                }
            }
        }
    }

    // Calculate normals in worker to avoid main thread computation
    mainMesh.normals = calculateNormals(mainMesh.vertices, mainMesh.indices);
    waterMesh.normals = calculateNormals(waterMesh.vertices, waterMesh.indices);

    mainMesh.waterMesh = waterMesh;
    return mainMesh;
};
