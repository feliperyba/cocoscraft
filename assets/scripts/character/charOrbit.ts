import {
    _decorator,
    animation,
    CapsuleCharacterController,
    CharacterControllerContact,
    clamp,
    Component,
    lerp,
    PhysicsSystem,
    Vec3,
} from 'cc';

import OrbitCamera from '../camera/orbitCamera';
import inputMap from '../movement/input';
const { ccclass, property, type } = _decorator;

@ccclass('Character')
export class Character extends Component {
    @property
    walkSpeed!: number;

    @property
    runSpeed!: number;

    @property
    jumpForce!: number;

    @property
    gravityValue!: number;

    @property
    linearDamping!: number;

    @property
    pushPower!: number;

    @type(OrbitCamera)
    camera!: OrbitCamera;

    @type(animation.AnimationController)
    animationCtrl!: animation.AnimationController;

    @type(CapsuleCharacterController)
    characterCtrl!: CapsuleCharacterController;

    private controlZ = 0;
    private controlX = 0;

    private movement = new Vec3(0, 0, 0);
    private tempVec3 = new Vec3(0, 0, 0);
    private playerVelocity = new Vec3(0, 0, 0);

    private currentSpeed = 0;
    private tempRotation = 0;
    private targetRotation = 0;

    protected onLoad(): void {
        this.characterCtrl.on('onControllerColliderHit', this.onControllerColliderHit, this);
    }

    onControllerColliderHit(hit: CharacterControllerContact): void {
        const body = hit.collider.attachedRigidBody;
        if (body == null || body.isKinematic) {
            return;
        }

        // We dont want to push objects below us
        if (hit.motionDirection.y < -0.1) {
            return;
        }

        // Calculate push direction from move direction,
        // we only push objects to the sides never up and down
        const pushDir = new Vec3(hit.motionDirection.x, 0, hit.motionDirection.z);

        // If you know how fast your character is trying to move,
        // then you can also multiply the push velocity by that.
        // Apply the push
        Vec3.multiplyScalar(pushDir, pushDir, this.pushPower);
        body.setLinearVelocity(pushDir);
    }

    // eslint-disable-next-line complexity
    update(deltaTime: number): void {
        if (this.characterCtrl.isGrounded) {
            this.playerVelocity.y = 0;
            this.controlZ = 0;
            this.controlX = 0;
        }

        deltaTime = PhysicsSystem.instance.fixedTimeStep;

        if (this.characterCtrl.isGrounded) {
            this.currentSpeed = inputMap.key.shift ? this.runSpeed : this.walkSpeed;
        }

        this.playerVelocity.y += this.gravityValue * deltaTime;

        const forward = this.node.forward;
        // const right = this.node.right;

        this.tempRotation = lerp(this.tempRotation, this.targetRotation, deltaTime * 10);
        this.node.eulerAngles = this.tempVec3.set(0, this.tempRotation, 0);

        // Apply inputs based on player's orientation
        if (inputMap.key.up && this.characterCtrl.isGrounded) {
            this.controlZ -= forward.z * deltaTime;
            this.controlX -= forward.x * deltaTime;
        }

        if (inputMap.key.down && this.characterCtrl.isGrounded) {
            this.controlZ += forward.z * deltaTime;
            this.controlX += forward.x * deltaTime;
        }

        if (inputMap.key.left) {
            this.targetRotation += 180 * deltaTime;
            /*this.controlZ -= right.z * deltaTime;
            this.controlX -= right.x * deltaTime;*/
        }

        if (inputMap.key.right) {
            this.targetRotation -= 180 * deltaTime;
            /*this.controlZ += right.z * deltaTime;
            this.controlX += right.x * deltaTime;*/
        }

        this.controlZ = clamp(this.controlZ, -1, 1);
        this.controlX = clamp(this.controlX, -1, 1);

        if (inputMap.key.space && !this.animationCtrl.getValue('isJumping') && this.characterCtrl.isGrounded) {
            this.playerVelocity.y += this.jumpForce;
        }

        //control impulse
        this.playerVelocity.z += this.controlZ * this.currentSpeed;
        this.playerVelocity.x += this.controlX * this.currentSpeed;

        this.playerVelocity.x *= this.linearDamping;
        this.playerVelocity.z *= this.linearDamping;

        // Create a new movement vector based on the character's input
        this.movement = Vec3.multiplyScalar(this.movement, this.playerVelocity, deltaTime);
        this.characterCtrl.move(this.movement);

        // Apply animations states
        this.animationCtrl.setValue('hasKicked', inputMap.key.f);
        this.animationCtrl.setValue('hasPunched', inputMap.key.g);
        this.animationCtrl.setValue('isGrounded', this.characterCtrl.isGrounded);
        this.animationCtrl.setValue('isJumping', inputMap.key.space);
        this.animationCtrl.setValue('hasCrouched', inputMap.key.c);
        this.animationCtrl.setValue('isCrouched', inputMap.key.c);
        this.animationCtrl.setValue('isRunning', inputMap.key.shift && this.characterCtrl.isGrounded);
        this.animationCtrl.setValue('isMoving', inputMap.key.up || inputMap.key.down);
    }
}
