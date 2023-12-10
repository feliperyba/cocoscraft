// We need to calculate that because Cocos does not have a aux function for normals
export const calculateNormals = (vertices: number[], indices: number[]): number[] => {
    const normals = new Array(vertices.length).fill(0);

    for (let i = 0; i < indices.length; i += 3) {
        const v0 = indices[i] * 3;
        const v1 = indices[i + 1] * 3;
        const v2 = indices[i + 2] * 3;

        const p0 = { x: vertices[v0], y: vertices[v0 + 1], z: vertices[v0 + 2] };
        const p1 = { x: vertices[v1], y: vertices[v1 + 1], z: vertices[v1 + 2] };
        const p2 = { x: vertices[v2], y: vertices[v2 + 1], z: vertices[v2 + 2] };

        const edge1 = { x: p1.x - p0.x, y: p1.y - p0.y, z: p1.z - p0.z };
        const edge2 = { x: p2.x - p0.x, y: p2.y - p0.y, z: p2.z - p0.z };

        const normal = crossProduct(edge1, edge2);

        normals[v0] += normal.x;
        normals[v0 + 1] += normal.y;
        normals[v0 + 2] += normal.z;

        normals[v1] += normal.x;
        normals[v1 + 1] += normal.y;
        normals[v1 + 2] += normal.z;

        normals[v2] += normal.x;
        normals[v2 + 1] += normal.y;
        normals[v2 + 2] += normal.z;
    }

    // Normalize the normals
    for (let i = 0; i < normals.length; i += 3) {
        const x = normals[i];
        const y = normals[i + 1];
        const z = normals[i + 2];

        const length = Math.sqrt(x * x + y * y + z * z);

        normals[i] = x / length;
        normals[i + 1] = y / length;
        normals[i + 2] = z / length;
    }

    return normals;
};

const crossProduct = (a: any, b: any) => {
    return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x,
    };
};
