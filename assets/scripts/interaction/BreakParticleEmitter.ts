import { _decorator, Component, MeshRenderer, Node, Vec3, Mesh, primitives, utils, Material, director, assetManager, Texture2D } from 'cc';

import { BlockType } from '../map/models/blocks';
import { BlockDataManager } from '../map/blockDataManager';

const { ccclass } = _decorator;

const ATLAS_UUID = '495fb923-713e-4b0d-908b-557c723b8aed@6c48a';
const TILE_SIZE = 0.125;
const TEX_OFFSET = 0.001;

// Atlas tile coords per block type (x, y) for side faces
const BLOCK_TILES: Record<number, [number, number]> = {
    [BlockType.GrassDirt]: [0, 1],
    [BlockType.Dirt]:      [0, 0],
    [BlockType.SandDirt]:  [0, 2],
    [BlockType.Sand]:      [0, 4],
    [BlockType.Stone]:     [0, 5],
    [BlockType.Water]:     [0, 6],
};

interface Particle {
    node: Node;
    active: boolean;
    velocity: Vec3;
    lifetime: number;
    maxLife: number;
    rotSpeed: Vec3;
    initialScale: number;
}

const POOL_SIZE = 80;
const GRAVITY = -22;

@ccclass('BreakParticleEmitter')
export class BreakParticleEmitter extends Component {
    private pool: Particle[] = [];
    private blockMeshes: Map<number, Mesh> = new Map();
    private material: Material | null = null;

    onLoad(): void {
        // Create one textured cube mesh per block type
        for (const [blockType, tile] of Object.entries(BLOCK_TILES)) {
            const bt = parseInt(blockType);
            const mesh = this.createTexturedCube(bt, tile);
            this.blockMeshes.set(bt, mesh);
        }

        // Create a shared unlit material with the atlas texture
        this.material = new Material();
        this.material.initialize({
            effectName: 'builtin-unlit',
            defines: { USE_ALBEDO_MAP: true },
        });
        this.material.setProperty('mainColor', new Vec3(1, 1, 1), 0);

        // Load atlas texture and assign to material
        assetManager.loadAny({ uuid: ATLAS_UUID, type: Texture2D }, (err, tex) => {
            if (err || !tex) {
                console.error('BreakParticleEmitter: Failed to load atlas:', err);
                return;
            }
            this.material?.setProperty('mainTexture', tex, 0);
        });

        for (let i = 0; i < POOL_SIZE; i++) {
            const node = new Node(`BreakP${i}`);
            const renderer = node.addComponent(MeshRenderer);
            renderer.setMaterial(this.material, 0);

            node.active = false;
            this.node.addChild(node);
            this.pool.push({
                node,
                active: false,
                velocity: new Vec3(),
                lifetime: 0,
                maxLife: 1,
                rotSpeed: new Vec3(),
                initialScale: 0.12,
            });
        }
    }

    private createTexturedCube(blockType: number, tile: [number, number]): Mesh {
        const size = 0.15;
        const s = size * 0.5;

        // Compute UVs for this tile
        const u0 = TILE_SIZE * tile[0] + TEX_OFFSET;
        const u1 = TILE_SIZE * tile[0] + TILE_SIZE - TEX_OFFSET;
        const v0 = TILE_SIZE * tile[1] + TEX_OFFSET;
        const v1 = TILE_SIZE * tile[1] + TILE_SIZE - TEX_OFFSET;

        // For grass blocks, use grass texture on top, dirt on bottom
        let topU0 = u0, topU1 = u1, topV0 = v0, topV1 = v1;
        let botU0 = u0, botU1 = u1, botV0 = v0, botV1 = v1;
        if (blockType === BlockType.GrassDirt) {
            // Top = grass tile (0,3)
            topU0 = TILE_SIZE * 0 + TEX_OFFSET;
            topU1 = TILE_SIZE * 0 + TILE_SIZE - TEX_OFFSET;
            topV0 = TILE_SIZE * 3 + TEX_OFFSET;
            topV1 = TILE_SIZE * 3 + TILE_SIZE - TEX_OFFSET;
            // Bottom = dirt tile (0,0)
            botU0 = TILE_SIZE * 0 + TEX_OFFSET;
            botU1 = TILE_SIZE * 0 + TILE_SIZE - TEX_OFFSET;
            botV0 = TILE_SIZE * 0 + TEX_OFFSET;
            botV1 = TILE_SIZE * 0 + TILE_SIZE - TEX_OFFSET;
        }

        const positions: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        let vi = 0;

        const addFace = (
            ax: number, ay: number, az: number,  bx: number, by: number, bz: number,
            cx: number, cy: number, cz: number,  dx: number, dy: number, dz: number,
            fu0: number, fv0: number, fu1: number, fv1: number
        ) => {
            positions.push(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz);
            uvs.push(fu0, fv1, fu0, fv0, fu1, fv0, fu1, fv1);
            indices.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
            vi += 4;
        };

        // Front (+z)
        addFace(-s, -s, s, s, -s, s, s, s, s, -s, s, s, u0, v0, u1, v1);
        // Back (-z)
        addFace(s, -s, -s, -s, -s, -s, -s, s, -s, s, s, -s, u0, v0, u1, v1);
        // Top (+y)
        addFace(-s, s, s, s, s, s, s, s, -s, -s, s, -s, topU0, topV0, topU1, topV1);
        // Bottom (-y)
        addFace(-s, -s, -s, s, -s, -s, s, -s, s, -s, -s, s, botU0, botV0, botU1, botV1);
        // Right (+x)
        addFace(s, -s, s, s, -s, -s, s, s, -s, s, s, s, u0, v0, u1, v1);
        // Left (-x)
        addFace(-s, -s, -s, -s, -s, s, -s, s, s, -s, s, -s, u0, v0, u1, v1);

        const geom = {
            positions: new Float32Array(positions),
            uv: new Float32Array(uvs),
            indices: new Uint16Array(indices),
        };

        return utils.MeshUtils.createMesh(geom as any);
    }

    emitBreakingDust(position: Vec3, blockType: BlockType): void {
        const count = 3;
        for (let i = 0; i < count; i++) {
            this.spawnParticle(position, blockType, 0.06, 1.5, 0.35);
        }
    }

    emitDestroyBurst(position: Vec3, blockType: BlockType): void {
        const count = 16;
        for (let i = 0; i < count; i++) {
            this.spawnParticle(position, blockType, 0.1 + Math.random() * 0.06, 3.5 + Math.random() * 2, 0.7 + Math.random() * 0.4);
        }
    }

    private spawnParticle(pos: Vec3, blockType: BlockType, size: number, speed: number, lifetime: number): void {
        const p = this.pool.find(p => !p.active);
        if (!p) return;

        // Set the correct mesh for this block type
        const mesh = this.blockMeshes.get(blockType) ?? this.blockMeshes.get(BlockType.Stone);
        const renderer = p.node.getComponent(MeshRenderer);
        if (mesh && renderer) {
            renderer.mesh = mesh;
        }

        p.active = true;
        p.lifetime = 0;
        p.maxLife = lifetime + Math.random() * 0.3;
        p.initialScale = size;

        const px = pos.x + 0.5 + (Math.random() - 0.5) * 0.4;
        const py = pos.y + 0.5 + (Math.random() - 0.5) * 0.4;
        const pz = pos.z + 0.5 + (Math.random() - 0.5) * 0.4;
        p.node.setWorldPosition(px, py, pz);

        // Outward burst with upward bias
        const dx = (Math.random() - 0.5);
        const dy = Math.random() * 0.8 + 0.4;
        const dz = (Math.random() - 0.5);
        const horizSpeed = (0.4 + Math.random() * 0.6) * speed;
        const vertSpeed = speed * dy;
        p.velocity.set(
            dx * horizSpeed,
            vertSpeed,
            dz * horizSpeed
        );

        // Random tumble
        p.rotSpeed.set(
            (Math.random() - 0.5) * 540,
            (Math.random() - 0.5) * 540,
            (Math.random() - 0.5) * 540
        );

        p.node.setScale(size, size, size);
        p.node.active = true;
    }

    update(dt: number): void {
        for (const p of this.pool) {
            if (!p.active) continue;

            p.lifetime += dt;
            if (p.lifetime >= p.maxLife) {
                p.active = false;
                p.node.active = false;
                continue;
            }

            // Gravity
            p.velocity.y += GRAVITY * dt;

            // Air resistance
            p.velocity.x *= 0.985;
            p.velocity.z *= 0.985;

            const pos = p.node.worldPosition;
            p.node.setWorldPosition(
                pos.x + p.velocity.x * dt,
                pos.y + p.velocity.y * dt,
                pos.z + p.velocity.z * dt
            );

            // Ground bounce
            if (p.node.worldPosition.y < 0.05) {
                p.node.setWorldPosition(p.node.worldPosition.x, 0.05, p.node.worldPosition.z);
                if (Math.abs(p.velocity.y) > 0.5) {
                    p.velocity.y = Math.abs(p.velocity.y) * 0.35;
                    p.velocity.x *= 0.6;
                    p.velocity.z *= 0.6;
                } else {
                    p.velocity.y = 0;
                    p.velocity.x *= 0.8;
                    p.velocity.z *= 0.8;
                }
            }

            // Scale shrink-fade in last 40% of life
            const lifeProgress = p.lifetime / p.maxLife;
            let scale: number;
            if (lifeProgress > 0.6) {
                const fadeT = (lifeProgress - 0.6) / 0.4;
                scale = p.initialScale * (1.0 - fadeT * fadeT);
            } else {
                scale = p.initialScale;
            }
            p.node.setScale(scale, scale, scale);

            // Tumble rotation
            const rot = p.node.eulerAngles;
            p.node.setRotationFromEuler(
                rot.x + p.rotSpeed.x * dt,
                rot.y + p.rotSpeed.y * dt,
                rot.z + p.rotSpeed.z * dt
            );
        }
    }
}
