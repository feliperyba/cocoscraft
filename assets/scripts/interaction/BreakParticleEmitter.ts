import { _decorator, Component, MeshRenderer, Node, Vec2, Vec3, Mesh, utils, Material, director, assetManager, Texture2D } from 'cc';

import { BlockType } from '../map/models/blocks';
import { BlockDataManager } from '../map/blockDataManager';

const { ccclass } = _decorator;

const ATLAS_UUID = '495fb923-713e-4b0d-908b-557c723b8aed@6c48a';

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
    private textureReady = false;
    private meshesReady = false;
    private particleRoot: Node | null = null;

    onLoad(): void {
        this.material = new Material();
        this.material.initialize({
            effectName: 'builtin-standard',
            defines: { USE_ALBEDO_MAP: true },
        });
        this.material.setProperty('mainColor', new Vec3(1, 1, 1), 0);
        this.material.setProperty('roughness', 0.8, 0);

        assetManager.loadAny({ uuid: ATLAS_UUID, type: Texture2D }, (err, tex) => {
            if (err || !tex) {
                console.error('BreakParticleEmitter: Failed to load atlas:', err);
                return;
            }
            this.material?.setProperty('mainTexture', tex, 0);
            this.textureReady = true;
        });

        this.particleRoot = new Node('BreakParticleRoot');
        director.getScene()!.addChild(this.particleRoot);

        for (let i = 0; i < POOL_SIZE; i++) {
            const node = new Node(`BreakP${i}`);
            const renderer = node.addComponent(MeshRenderer);
            renderer.setMaterial(this.material, 0);

            node.active = false;
            this.particleRoot.addChild(node);
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

    private ensureMeshes(): void {
        if (this.meshesReady) return;
        if (BlockDataManager.tileSizeX === undefined) return;

        for (const [blockType, texData] of BlockDataManager.blockTextureDataDictionary) {
            if (!texData.isSolid && blockType !== BlockType.Water) continue;
            const mesh = this.createBlockMesh(blockType, texData.up, texData.down, texData.side);
            this.blockMeshes.set(blockType, mesh);
        }

        if (this.blockMeshes.size > 0) {
            this.meshesReady = true;
        }
    }

    private createBlockMesh(blockType: number, upTile: Vec2, downTile: Vec2, sideTile: Vec2): Mesh {
        const size = 0.15;
        const s = size * 0.5;

        const tx = BlockDataManager.tileSizeX;
        const ty = BlockDataManager.tileSizeY;
        const off = BlockDataManager.textureOffset;

        const tileUV = (tile: Vec2): [number, number, number, number] => [
            tx * tile.x + off,
            tx * tile.x + tx - off,
            ty * tile.y + off,
            ty * tile.y + ty - off,
        ];

        const [su0, su1, sv0, sv1] = tileUV(sideTile);
        const [uu0, uu1, uv0, uv1] = tileUV(upTile);
        const [du0, du1, dv0, dv1] = tileUV(downTile);

        const positions: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        let vi = 0;

        const addFace = (
            ax: number, ay: number, az: number, bx: number, by: number, bz: number,
            cx: number, cy: number, cz: number, dx: number, dy: number, dz: number,
            fu0: number, fv0: number, fu1: number, fv1: number,
        ) => {
            positions.push(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz);
            uvs.push(fu0, fv1, fu0, fv0, fu1, fv0, fu1, fv1);
            indices.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
            vi += 4;
        };

        addFace(-s, -s, s, s, -s, s, s, s, s, -s, s, s, su0, sv0, su1, sv1);
        addFace(s, -s, -s, -s, -s, -s, -s, s, -s, s, s, -s, su0, sv0, su1, sv1);
        addFace(-s, s, s, s, s, s, s, s, -s, -s, s, -s, uu0, uv0, uu1, uv1);
        addFace(-s, -s, -s, s, -s, -s, s, -s, s, -s, -s, s, du0, dv0, du1, dv1);
        addFace(s, -s, s, s, -s, -s, s, s, -s, s, s, s, su0, sv0, su1, sv1);
        addFace(-s, -s, -s, -s, -s, s, -s, s, s, -s, s, -s, su0, sv0, su1, sv1);

        const geom = {
            positions: new Float32Array(positions),
            uv: new Float32Array(uvs),
            indices: new Uint16Array(indices),
        };

        return utils.MeshUtils.createMesh(geom as any);
    }

    emitBreakingDust(position: Vec3, blockType: BlockType): void {
        this.ensureMeshes();
        if (!this.meshesReady || !this.textureReady) return;
        const count = 3;
        for (let i = 0; i < count; i++) {
            this.spawnParticle(position, blockType, 0.06, 1.5, 0.35);
        }
    }

    emitDestroyBurst(position: Vec3, blockType: BlockType): void {
        this.ensureMeshes();
        if (!this.meshesReady || !this.textureReady) return;
        const count = 16;
        for (let i = 0; i < count; i++) {
            this.spawnParticle(position, blockType, 0.1 + Math.random() * 0.06, 3.5 + Math.random() * 2, 0.7 + Math.random() * 0.4);
        }
    }

    private spawnParticle(pos: Vec3, blockType: BlockType, size: number, speed: number, lifetime: number): void {
        const p = this.pool.find(p => !p.active);
        if (!p) return;

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

        const dx = (Math.random() - 0.5);
        const dy = Math.random() * 0.8 + 0.4;
        const dz = (Math.random() - 0.5);
        const horizSpeed = (0.4 + Math.random() * 0.6) * speed;
        const vertSpeed = speed * dy;
        p.velocity.set(dx * horizSpeed, vertSpeed, dz * horizSpeed);

        p.rotSpeed.set(
            (Math.random() - 0.5) * 540,
            (Math.random() - 0.5) * 540,
            (Math.random() - 0.5) * 540,
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

            p.velocity.y += GRAVITY * dt;
            p.velocity.x *= 0.985;
            p.velocity.z *= 0.985;

            const pos = p.node.worldPosition;
            p.node.setWorldPosition(
                pos.x + p.velocity.x * dt,
                pos.y + p.velocity.y * dt,
                pos.z + p.velocity.z * dt,
            );

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

            const lifeProgress = p.lifetime / p.maxLife;
            let scale: number;
            if (lifeProgress > 0.6) {
                const fadeT = (lifeProgress - 0.6) / 0.4;
                scale = p.initialScale * (1.0 - fadeT * fadeT);
            } else {
                scale = p.initialScale;
            }
            p.node.setScale(scale, scale, scale);

            const rot = p.node.eulerAngles;
            p.node.setRotationFromEuler(
                rot.x + p.rotSpeed.x * dt,
                rot.y + p.rotSpeed.y * dt,
                rot.z + p.rotSpeed.z * dt,
            );
        }
    }
}
