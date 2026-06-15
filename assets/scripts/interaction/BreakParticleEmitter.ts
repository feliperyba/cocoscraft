import { _decorator, Component, MeshRenderer, Node, Vec3, Mesh, primitives, utils, Material, director } from 'cc';

import { BlockType } from '../map/models';

const { ccclass } = _decorator;

const BLOCK_COLORS: Record<number, Vec3> = {
    [BlockType.Grass]: new Vec3(0.35, 0.55, 0.2),
    [BlockType.Dirt]:  new Vec3(0.45, 0.3, 0.15),
    [BlockType.Stone]: new Vec3(0.5, 0.5, 0.5),
    [BlockType.Sand]:  new Vec3(0.76, 0.7, 0.45),
    [BlockType.Water]: new Vec3(0.1, 0.4, 0.7),
};

interface Particle {
    node: Node;
    active: boolean;
    velocity: Vec3;
    lifetime: number;
    maxLife: number;
    rotSpeed: Vec3;
}

const POOL_SIZE = 64;
const GRAVITY = -18;

@ccclass('BreakParticleEmitter')
export class BreakParticleEmitter extends Component {
    private pool: Particle[] = [];
    private cubeMesh: Mesh | null = null;

    onLoad(): void {
        this.cubeMesh = utils.MeshUtils.createMesh(primitives.box({ width: 0.15, height: 0.15, length: 0.15 }));

        for (let i = 0; i < POOL_SIZE; i++) {
            const node = new Node(`BreakP${i}`);
            const renderer = node.addComponent(MeshRenderer);
            if (this.cubeMesh) renderer.mesh = this.cubeMesh;

            const mat = new Material();
            mat.initialize({ effectName: 'builtin-unlit' });
            mat.setProperty('mainColor', new Vec3(0.5, 0.5, 0.5), 0);
            renderer.setMaterial(mat, 0);

            node.active = false;
            this.node.addChild(node);
            this.pool.push({
                node,
                active: false,
                velocity: new Vec3(),
                lifetime: 0,
                maxLife: 1,
                rotSpeed: new Vec3(),
            });
        }
    }

    emitBreakingDust(position: Vec3, blockType: BlockType): void {
        const count = 2;
        for (let i = 0; i < count; i++) {
            this.spawnParticle(position, blockType, 0.06, 1.5, 0.4);
        }
    }

    emitDestroyBurst(position: Vec3, blockType: BlockType): void {
        const count = 12;
        for (let i = 0; i < count; i++) {
            this.spawnParticle(position, blockType, 0.12, 4, 0.8);
        }
    }

    private spawnParticle(pos: Vec3, blockType: BlockType, size: number, speed: number, lifetime: number): void {
        const p = this.pool.find(p => !p.active);
        if (!p) return;

        p.active = true;
        p.lifetime = 0;
        p.maxLife = lifetime + Math.random() * 0.3;

        const px = pos.x + 0.5 + (Math.random() - 0.5) * 0.3;
        const py = pos.y + 0.5 + (Math.random() - 0.5) * 0.3;
        const pz = pos.z + 0.5 + (Math.random() - 0.5) * 0.3;
        p.node.setWorldPosition(px, py, pz);

        const angle = Math.random() * Math.PI * 2;
        const horizSpeed = (Math.random() * 0.5 + 0.5) * speed;
        p.velocity.set(
            Math.cos(angle) * horizSpeed,
            Math.random() * speed + 1,
            Math.sin(angle) * horizSpeed
        );

        p.rotSpeed.set(
            (Math.random() - 0.5) * 720,
            (Math.random() - 0.5) * 720,
            (Math.random() - 0.5) * 720
        );

        p.node.setScale(size, size, size);
        p.node.active = true;

        const color = BLOCK_COLORS[blockType] ?? new Vec3(0.5, 0.5, 0.5);
        const renderer = p.node.getComponent(MeshRenderer);
        const mat = renderer?.getMaterial(0);
        mat?.setProperty('mainColor', color, 0);
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

            const pos = p.node.worldPosition;
            p.node.setWorldPosition(
                pos.x + p.velocity.x * dt,
                pos.y + p.velocity.y * dt,
                pos.z + p.velocity.z * dt
            );

            if (p.node.worldPosition.y < 0) {
                p.velocity.y = Math.abs(p.velocity.y) * 0.3;
                p.velocity.x *= 0.7;
                p.velocity.z *= 0.7;
                p.node.setWorldPosition(p.node.worldPosition.x, 0, p.node.worldPosition.z);
            }

            const lifeFactor = 1 - p.lifetime / p.maxLife;
            const baseScale = 0.12;
            const scale = baseScale * lifeFactor;
            p.node.setScale(scale, scale, scale);

            const rot = p.node.eulerAngles;
            p.node.setRotationFromEuler(
                rot.x + p.rotSpeed.x * dt,
                rot.y + p.rotSpeed.y * dt,
                rot.z + p.rotSpeed.z * dt
            );
        }
    }
}
