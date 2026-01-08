import { _decorator, Component, Material, ParticleSystem, Vec3 } from 'cc';

import { BlockType } from '../map/models';

const { ccclass, type } = _decorator;

@ccclass('BreakParticleEmitter')
export class BreakParticleEmitter extends Component {
    @type(ParticleSystem)
    particleSystem!: ParticleSystem;

    @type([Material])
    blockMaterials: Material[] = []; // One material per BlockType

    /**
     * Emit particles during breaking (small dust).
     */
    emitBreakingDust(position: Vec3, blockType: BlockType): void {
        // // Small particles while breaking
        // this.particleSystem.node.setWorldPosition(position);
        // // For simplicity, we just emit.
        // if (this.particleSystem.startSizeX) {
        //     this.particleSystem.startSizeX.constant = 0.05;
        // }
        // const material = this.blockMaterials[blockType];
        // if (material && this.particleSystem.renderer) {
        //     this.particleSystem.renderer.particleMaterial = material;
        // }
        // this.particleSystem.play();
    }

    /**
     * Emit burst when block is destroyed.
     */
    emitDestroyBurst(position: Vec3, blockType: BlockType): void {
        // const material = this.blockMaterials[blockType];
        // if (material && this.particleSystem.renderer) {
        //     this.particleSystem.renderer.particleMaterial = material;
        // }
        // this.particleSystem.node.setWorldPosition(position.x + 0.5, position.y + 0.5, position.z + 0.5);
        // if (this.particleSystem.startSizeX) {
        //     this.particleSystem.startSizeX.constant = 0.15;
        // }
        // if (this.particleSystem.startSpeed) {
        //     this.particleSystem.startSpeed.constant = 3;
        // }
        // if (this.particleSystem.startLifetime) {
        //     this.particleSystem.startLifetime.constant = 0.8;
        // }
        // this.particleSystem.play();
    }
}
