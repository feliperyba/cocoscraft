import { _decorator, Vec2, Vec3 } from 'cc';

const { ccclass } = _decorator;

@ccclass('MeshData')
export class MeshData {
    vertices: Vec3[] = [];
    triangles: number[] = [];
    uv: Vec2[] = [];

    collisionVertices: Vec3[] = [];
    collisionTriangles: number[] = [];

    waterMesh: MeshData;
    isMainMesh = true;

    constructor(isMainMesh: boolean) {
        if (!isMainMesh) {
            this.waterMesh = new MeshData(false);
        }
    }

    addVertex(vertex: Vec3, generatesCollider: boolean): void {
        this.vertices.push(vertex);

        if (!generatesCollider) return;
        this.collisionVertices.push(vertex);
    }

    addQuadTriangle(generatesCollider: boolean): void {
        this.addVerticesToTriangles(this.triangles, this.vertices);

        if (!generatesCollider) return;
        this.addVerticesToTriangles(this.collisionTriangles, this.collisionVertices);
    }

    addVerticesToTriangles(triangles: number[], vertices: Vec3[]): void {
        const len = vertices.length;
        triangles.push(len - 4, len - 3, len - 2, len - 4, len - 2, len - 1);
    }
}
