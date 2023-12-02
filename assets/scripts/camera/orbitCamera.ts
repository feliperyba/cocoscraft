import { _decorator, Component, EventMouse, Input, input, lerp, Node, Quat, Vec2, Vec3 } from 'cc';
import { EDITOR } from 'cc/env';

const { ccclass, property, type } = _decorator;

const tempVec3 = new Vec3();
const tempVec3_2 = new Vec3();
const tempQuat = new Quat();
const DeltaFactor = 1 / 200;

@ccclass('OrbitCamera')
export default class OrbitCamera extends Component {
    @property
    enableTouch = true;

    @property
    enableScaleRadius = false;

    @property
    autoRotate = false;

    @property
    autoRotateSpeed = 90;

    @property
    rotateSpeed = 1;

    @property
    followSpeed = 1;

    @property
    xRotationRange = new Vec2(5, 70);

    @type(Node)
    target: Node | null = null;

    @property
    radiusScaleSpeed = 1;

    @property
    minRadius = 5;

    @property
    maxRadius = 10;

    @property
    followTargetRotationY = true;

    @property
    private startRotation = new Vec3();

    @property
    private targetRadius = 10;

    @type(Node)
    get targetNode(): Node {
        return this.target;
    }
    set targetNode(v) {
        this.target = v;
        this.targetRotationVec3.set(this.startRotation);
        this.targetCenter.set(v.worldPosition);
    }

    @property
    get targetRotationVec3(): Vec3 {
        if (!EDITOR) {
            this.startRotation.set(this.targetRotation);
        }
        return this.startRotation;
    }
    set targetRotationVec3(v: Vec3) {
        this.targetRotation.set(v);
        this.startRotation.set(v);
    }

    @property
    get radiusTarget(): number {
        return this.targetRadius;
    }
    set radiusTarget(v) {
        this.targetRadius = v;
    }

    private center = new Vec3();
    private targetCenter = new Vec3();
    private touched = false;
    private targetRotation = new Vec3();
    private rotation = new Quat();
    private radiusVelocity: number = 0;

    start(): void {
        input.on(Input.EventType.MOUSE_DOWN, this.onTouchStart, this);
        input.on(Input.EventType.MOUSE_MOVE, this.onTouchMove, this);
        input.on(Input.EventType.MOUSE_UP, this.onTouchEnd, this);

        if (this.enableScaleRadius) {
            input.on(Input.EventType.MOUSE_WHEEL, this.onMouseWhee, this);
        }

        this.resetTargetRotation();
        Quat.fromEuler(this.rotation, this.targetRotationVec3.x, this.targetRotationVec3.y, this.targetRotationVec3.z);

        if (this.target) {
            this.targetCenter.set(this.target.worldPosition);
            this.center.set(this.targetCenter);
        }

        this.radiusTarget = this.targetRadius;
        this.limitRotation();
    }

    resetTargetRotation(): void {
        let targetRotation = this.targetRotationVec3.set(this.startRotation);
        if (!this.followTargetRotationY) return;

        targetRotation = tempVec3_2.set(targetRotation);
        Quat.toEuler(tempVec3, this.target.worldRotation);
        targetRotation.y = lerp(targetRotation.y, targetRotation.y + tempVec3.y, 0.5);
    }

    onTouchStart(): void {
        this.touched = true;
    }

    onTouchMove(touch?: EventMouse): void {
        if (!this.touched) return;

        const delta = touch.getDelta();

        Quat.fromEuler(tempQuat, this.targetRotationVec3.x, this.targetRotationVec3.y, this.targetRotationVec3.z);
        Quat.rotateX(tempQuat, tempQuat, -delta.y * DeltaFactor);
        Quat.rotateAround(tempQuat, tempQuat, Vec3.UP, -delta.x * DeltaFactor);
        Quat.toEuler(this.targetRotationVec3, tempQuat);

        this.limitRotation();
    }

    onTouchEnd(): void {
        this.touched = false;
    }

    onMouseWhee(event: EventMouse): void {
        const scrollY = event.getScrollY();
        this.radiusVelocity += this.radiusScaleSpeed * -Math.sign(scrollY) * 0.25;
    }

    limitRotation(): void {
        const rotation = this.targetRotationVec3;
        rotation.x = Math.max(this.xRotationRange.x, Math.min(rotation.x, this.xRotationRange.y));
        rotation.z = 0;
    }

    update(dt: number): void {
        let targetRotation = this.targetRotationVec3;

        if (this.autoRotate && !this.touched) {
            targetRotation.y += this.autoRotateSpeed * dt;
        }

        if (this.target) {
            this.targetCenter.set(this.target.worldPosition);

            if (this.followTargetRotationY) {
                targetRotation = tempVec3_2.set(targetRotation);
                Quat.toEuler(tempVec3, this.target.worldRotation);
                targetRotation.y += tempVec3.y;
            }
        }

        Quat.fromEuler(tempQuat, targetRotation.x, targetRotation.y, targetRotation.z);
        Quat.slerp(this.rotation, this.rotation, tempQuat, dt * 7 * this.rotateSpeed);
        Vec3.lerp(this.center, this.center, this.targetCenter, dt * 5 * this.followSpeed);

        // Calculate the difference between the target radius and the current radius
        const radiusDiff = this.targetRadius - this.radiusTarget;

        // Add a fraction of the difference to the velocity
        this.radiusVelocity += radiusDiff * 0.01;

        // Apply the velocity to the radius, and reduce the velocity a bit
        this.radiusTarget += this.radiusVelocity;
        this.radiusVelocity *= 0.9;

        // Limit the radius within the minRadius and maxRadius range
        this.radiusTarget = Math.max(this.minRadius, Math.min(this.radiusTarget, this.maxRadius));

        Vec3.transformQuat(tempVec3, Vec3.FORWARD, this.rotation);
        Vec3.multiplyScalar(tempVec3, tempVec3, this.radiusTarget);
        tempVec3.add(this.center);

        this.node.position = tempVec3;
        this.node.lookAt(this.center);
    }
}
