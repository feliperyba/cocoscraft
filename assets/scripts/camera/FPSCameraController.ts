import {
    _decorator,
    CapsuleCharacterController,
    Component,
    EventMouse,
    game,
    Input,
    input,
    math,
    Node,
    Quat,
    Vec3,
} from 'cc';
const { ccclass, property } = _decorator;

@ccclass('FPSCameraController')
export class FPSCameraController extends Component {
    @property({ type: CapsuleCharacterController })
    charCtrl?: CapsuleCharacterController;

    @property
    smooth = 6;

    @property({ type: Node })
    postProcess?: Node;

    private angleVec = new Vec3();
    private curAngleVec = new Vec3();

    private angleSpeed = 30;
    private angleSmooth = 6;

    private pointerLock = false;

    start(): void {
        input.on(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
        document.addEventListener('pointerlockchange', this.onPointerChange, false);
        game.canvas?.addEventListener('click', this.onCanvasClick, false);
    }

    private onPointerChange = (): void => {
        this.pointerLock = document.pointerLockElement === game.canvas;
    };

    private onCanvasClick = (): void => {
        if (this.pointerLock) return;

        const active = document.activeElement as HTMLElement | null;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;

        game.canvas?.requestPointerLock?.();
    };

    onMouseMove(event: EventMouse): void {
        this.angleVec.y -= event.getDeltaX() / this.angleSpeed;
        this.angleVec.x += event.getDeltaY() / this.angleSpeed;

        this.angleVec.x = math.clamp(this.angleVec.x, -50, 90);
    }

    update(deltaTime: number): void {
        if (!this.charCtrl) return;

        this.curAngleVec.x = math.lerp(this.curAngleVec.x, this.angleVec.x, this.angleSmooth * deltaTime);
        this.curAngleVec.y = math.lerp(this.curAngleVec.y, this.angleVec.y, this.angleSmooth * deltaTime);

        const horizontalRotation = Quat.fromEuler(new Quat(), 0, this.curAngleVec.y, 0);
        const verticalRotation = Quat.fromEuler(new Quat(), this.curAngleVec.x, 180, 0);

        this.charCtrl.node.setRotation(horizontalRotation);
        this.node.setRotation(verticalRotation);
    }

    protected onDestroy(): void {
        input.off(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
        document.removeEventListener('pointerlockchange', this.onPointerChange, false);
        game.canvas?.removeEventListener('click', this.onCanvasClick, false);
    }
}
