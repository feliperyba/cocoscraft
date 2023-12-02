import {
    _decorator,
    Camera,
    Color,
    Component,
    director,
    geometry,
    GeometryRenderer,
    IVec3,
    IVec3Like,
    Mat4,
    MeshRenderer,
    Node,
    PhysicsSystem,
    Quat,
    quat,
    randomRangeInt,
    renderer,
    v3,
    Vec2,
    Vec3,
} from 'cc';
import { EDITOR_NOT_IN_PREVIEW } from 'cc/env';

import { GRandom } from './grandom';
const { ccclass, property } = _decorator;

export class Util {
    public static deltaLimit(value: number, delta: number, speed: number, min: number, max: number): number {
        value += delta * speed;
        if (value < min) value = min;
        if (value > max) value = max;
        return value;
    }

    public static calculateMaxBounders(renders: MeshRenderer[]) {
        let max_x = 0;
        let max_y = 0;
        let max = 0;

        for (let i = 0; i < renders.length; i++) {
            if (!renders[i].node.active) continue;
            const x = renders[i].model!.worldBounds.halfExtents.x * renders[i].node.scale.x;
            if (x > max_x) {
                max_x = x;
            }

            const y = renders[i].model!.worldBounds.halfExtents.y * renders[i].node.scale.y;
            if (y > max_y) {
                max_y = y;
            }
        }

        max = max_x > max_y ? max_x : max_y;

        return { x: max_x, y: max_y, max: max };
    }

    public static calculateMask(masks: number[]): number {
        let mask = 0;
        for (let i = 0; i < masks.length; i++) mask = mask | (1 << masks[i]);

        return mask;
    }

    public static deepCopy(sourceObject: Object): Object {
        return JSON.parse(JSON.stringify(sourceObject));
    }
}

export class UtilStr {
    public static equal(str: string, items: string[]): boolean {
        const count = items.length;
        for (let i = 0; i < count; i++) {
            const t = items[i];
            if (str === t) {
                return true;
            }
        }
        return false;
    }

    public static include(str: string, items: string[]): boolean {
        const count = items.length;
        for (let i = 0; i < count; i++) {
            const t = items[i];
            if (str.includes(t)) {
                return true;
            }
        }
        return false;
    }

    public static selectFromItems(items: string[], len: number = -1): string {
        const count = len === -1 ? items.length : len;
        const idx = randomRangeInt(0, count);
        return items[idx];
    }
}

export class UtilMaterial {
    public static setColor(node: Node, color: Color) {
        const meshRender = node.getComponent(MeshRenderer);
        meshRender?.material?.setProperty('mainColor', color);
    }
}

export class UtilVec3 {
    public static deltaLimit(vec: Vec3, delta: Vec3, speed: number, min: Vec3, max: Vec3) {
        vec.x = Util.deltaLimit(vec.x, delta.x, speed, min.x, max.y);
        vec.y = Util.deltaLimit(vec.y, delta.y, speed, min.y, max.y);
        vec.z = Util.deltaLimit(vec.z, delta.z, speed, min.z, max.z);
    }

    public static copy(a: Vec3, b: IVec3) {
        a.x = b.x;
        a.y = b.y;
        a.z = b.z;
    }

    public static scaleDirection(a: Vec3, direction: Vec3, scale: number) {
        a.x += direction.x * scale;
        a.y += direction.y * scale;
        a.z += direction.z * scale;
    }

    public static clampMagnitude(target: Vec3, length: number) {
        if (target.length() > length) {
            target.normalize().multiplyScalar(length);
        }
    }
}

export class UtilVec2 {
    public static deltaLimit(vec: Vec2, delta: Vec2, speed: number, min: Vec2, max: Vec2) {
        vec.x = Util.deltaLimit(vec.x, delta.x, speed, min.x, max.y);
        vec.y = Util.deltaLimit(vec.y, delta.y, speed, min.y, max.y);
    }

    public static c(a: Vec2, b: Vec2) {
        a.x = b.x;
        a.y = b.y;
    }
}

export class UtilArray {
    public static remove<T>(array: T[], key: T): void {
        const index = array.indexOf(key, 0);
        if (index !== -1) {
            array.splice(index, 0);
        }
    }

    public static init(len: number, value: number = 0) {
        const a = [];
        for (let i = 0; i < len; i++) a.push(value);
        return a;
    }

    public static init_3(a0: number, a1: number, a2: number): number[][][] {
        const array = [];
        for (let i = 0; i < a0; i++) {
            const ai = [];
            for (let j = 0; j < a1; j++) {
                const aj = [];
                for (let k = 0; k < a2; k++) {
                    aj.push(0);
                }
                ai.push(aj);
            }
            array.push(ai);
        }
        return array;
    }

    public static reset_3(a: number[][][], value: number = 0) {
        const a0 = a.length;
        const a1 = a[0].length;
        const a2 = a[0][0].length;
        for (let i = 0; i < a0; i++) {
            for (let j = 0; j < a1; j++) {
                for (let k = 0; k < a2; k++) {
                    a[i][j][k] = value;
                }
            }
        }
    }

    public static addArray(a: number[], b: number[]) {
        for (let i = 0; i < b.length; i++) {
            a.push(b[i]);
        }
    }
}

export class UtilNode {
    public static getChildByName(node: Node, name: string): Node {
        const child = node.getChildByName(name);
        if (child === null) throw new Error(`${node.name} node children not find '${name}'`);
        return child;
    }

    public static getComponent<T extends Component>(node: Node, type: { new (): T }): T {
        const component = node.getComponent(type) as T;
        if (component === null) throw new Error(`${node.name} node not find '${name}'`);
        return component;
    }

    public static getChildComponent<T extends Component>(node: Node, name: string, type: { new (): T }): T {
        const child = this.getChildByName(node, name);
        return this.getComponent(child, type);
    }

    public static getChildren(node: Node): Node[] {
        const ls: Node[] = [];
        const find = (node: Node) => {
            ls.push(node);
            node.children.forEach(element => {
                if (element.children) {
                    find(element);
                }
            });
        };
        find(node);
        return ls;
    }

    public static find(node: Node, name: string): Node {
        let n: Node = Object.create(null);
        const find = (node: Node, name: string) => {
            if (node.name === name) {
                n = node;
                return;
            }
            node.children.forEach(element => {
                if (element.children) {
                    find(element, name);
                }
            });
        };
        find(node, name);
        return n;
    }

    public static getChildrenByNameBlur(node: Node, blurName: string): { [key: string]: Node } {
        const map: { [key: string]: Node } = {};
        const find = (node: Node) => {
            if (node.name.concat(blurName)) {
                map[node.name] = node;
            }
            map[node.name] = node;
            node.children.forEach(element => {
                if (element.children) {
                    find(element);
                }
            });
        };
        find(node);

        return map;
    }

    public static getParentComponent<T extends Component>(node: Node | null, type: { new (): T }): T | undefined {
        if (node === null) {
            return undefined;
        }
        const component = node?.getComponent(type) as T;
        if (component !== null) return component;

        return this.getParentComponent(node.parent, type);
    }

    static _worldRotation: Quat = new Quat();
    static _angle: Vec3 = v3(0, 0, 0);
    public static getWorldEulerAngles(node: Node) {
        node.getWorldRotation(this._worldRotation);
        this._worldRotation.getEulerAngles(this._angle);
        return this._angle;
    }
}

export class UtilLog {
    public static children(node: Node) {
        let info = `${node.name}:${node.children.length}:`;
        node.children.forEach(n => {
            info += `${n.name},`;
        });
        console.log(info);
    }
}

export function waitFor(duration: number) {
    return new Promise<void>(resolve => {
        setTimeout(() => {
            resolve();
        }, duration * 1000.0);
    });
}

export class UtilCurve {
    public static Bezier(points: number[], t: number) {
        const len = points.length / 3;
    }

    public static ParaCurve(
        s: number,
        x: number,
        y: number,
        z: number,
        vx: number,
        vy: number,
        vz: number,
        g: number,
        segment: number
    ) {
        const points: number[] = [];

        // Calculate total time.
        const totalTime = Math.sqrt((2 * s) / g);
        const cell_time = totalTime / segment;

        // x = vx * t
        // z = vz * t
        // y = 1/2 * g * t * t.
        // g = 0.98.
        let cur_time = 0;
        for (let i = 0; i <= segment; i++) {
            const xi = vx * cur_time + x;
            const zi = vz * cur_time + z;
            const yi = vy * cur_time - (1 / 2) * g * cur_time * cur_time + y;
            points.push(xi);
            points.push(yi);
            points.push(zi);
            cur_time += cell_time;
        }
        return points;
    }

    public static ParaCurveByDir(
        s: number,
        x: number,
        y: number,
        z: number,
        vx: number,
        vy: number,
        vz: number,
        g: number,
        dx: number,
        dy: number,
        dz: number,
        segment: number
    ) {
        const points: number[] = [];

        // Calculate total time.
        const totalTime = Math.sqrt((2 * s) / g);
        const cell_time = totalTime / segment;

        // x = vx * t
        // z = vz * t
        // y = 1/2 * g * t * t.
        // g = 0.98.
        let cur_time = 0;
        for (let i = 0; i <= segment; i++) {
            const xi = vx * cur_time + x;
            const zi = vz * cur_time + z;
            const yi = vy * cur_time - (1 / 2) * g * cur_time * cur_time + y;
            points.push(xi * dx);
            points.push(yi * dy);
            points.push(zi * dz);
            cur_time += cell_time;
        }
        return points;
    }
}

export class UtilRandom {
    public static pos(rand: GRandom, min: Vec3, max: Vec3, f: number = 1000): Vec3 {
        const pos = v3(0, 0, 0);
        pos.x = rand.range(min.x, max.x) / f;
        pos.y = rand.range(min.y, max.y) / f;
        pos.z = rand.range(min.z, max.z) / f;
        return pos;
    }

    public static angle(rand: GRandom, min: Vec3, max: Vec3): Vec3 {
        const angle = v3(0, 0, 0);
        angle.x = rand.range(min.x, max.x);
        angle.y = rand.range(min.y, max.y);
        angle.z = rand.range(min.z, max.z);
        return angle;
    }

    public static scale(rand: GRandom, min: Vec3, max: Vec3, f: number = 1000): Vec3 {
        const scale = v3(0, 0, 0);
        scale.x = rand.range(min.x, max.x) / f;
        scale.y = rand.range(min.y, max.y) / f;
        scale.z = rand.range(min.z, max.z) / f;
        return scale;
    }
}

export namespace Gizmo {
    const tmpV3 = v3(0, 0, 0);
    const tmpV3_2 = v3(0, 0, 0);

    let isClose = true;

    let gizmoCamera: renderer.scene.Camera;

    export function SetState() {
        isClose = !isClose;
    }

    export function setCamera(camera: Camera) {
        gizmoCamera = camera.camera;
    }

    export function getGeometryRender(): GeometryRenderer | null | undefined {
        //const camera = CameraSetting.mainCamera && CameraSetting.mainCamera.camera;
        //if (camera) {
        //    camera.initGeometryRenderer();
        //}
        //cc.director.root.cameraList.find(c => c.name === 'Editor Camera')

        if (isClose) return undefined;

        let camera: renderer.scene.Camera | undefined = undefined;
        if (EDITOR_NOT_IN_PREVIEW) camera = globalThis.cce?.Camera._camera.camera as renderer.scene.Camera;
        else {
            camera = gizmoCamera;
            //camera = CameraSetting.mainCamera && CameraSetting.mainCamera.camera;
            //console.log(camera.node.name);
        }

        if (camera) {
            camera.initGeometryRenderer();
            const geometryRenderer = (camera && camera.geometryRenderer) || director.root?.pipeline.geometryRenderer;
            return geometryRenderer;
        }

        return undefined;
    }

    export function drawLine(p0: Vec3, p1: Vec3, color: Color = Color.GREEN) {
        const geometryRenderer = getGeometryRender();
        if (!geometryRenderer) return;
        //let geometryRenderer = director.root?.pipeline.geometryRenderer;
        geometryRenderer?.addLine(p0, p1, color, undefined);
    }

    export function drawLineDirection(p0: Vec3, direction: Vec3, distance: number = 1, color = Color.GREEN) {
        Vec3.copy(tmpV3, p0);
        Vec3.copy(tmpV3_2, direction);
        tmpV3_2.multiplyScalar(distance);
        tmpV3.add(tmpV3_2);
        const geometryRenderer = getGeometryRender();
        if (!geometryRenderer) return;
        //let geometryRenderer = director.root?.pipeline.geometryRenderer;
        geometryRenderer?.addLine(p0, tmpV3, color, false);
    }

    export function drawCircle(center: Vec3, radius: number, color: Color = Color.YELLOW) {
        const geometryRenderer = getGeometryRender();
        if (!geometryRenderer) return;
        //let geometryRenderer = director.root?.pipeline.geometryRenderer;
        geometryRenderer?.addCircle(center, radius, color, 10, true, undefined, undefined);
    }

    export function drawBox(center: IVec3Like, size: Vec3, color: Color = Color.BLUE) {
        const geometryRenderer = getGeometryRender();
        if (!geometryRenderer) return;
        const border = new geometry.AABB(center.x, center.y, center.z, size.x, size.y, size.z);
        //let geometryRenderer = director.root?.pipeline.geometryRenderer;
        geometryRenderer?.addBoundingBox(border, color, true, false);
    }

    export function drawCapsule(position: Vec3, center: Vec3, radius: number, height: number, color = Color.GREEN) {
        const geometryRenderer = getGeometryRender();
        if (!geometryRenderer) return;
        //console.log('draw capsule:', center, radius, height, color);
        Vec3.copy(tmpV3, position);
        tmpV3.add(center);
        geometryRenderer.addCapsule(tmpV3, radius, height, color, 12, 4, true, false);
    }

    export function drawSphere(position: Vec3, radius: number, color = Color.GREEN) {
        const geometryRenderer = getGeometryRender();
        if (!geometryRenderer) return;
        //console.log('draw capsule:', center, radius, height, color);
        Vec3.copy(tmpV3, position);
        geometryRenderer.addSphere(position, radius, color, 4, 4);
    }
}

export class UtilTime {
    public static toHours(seconds: number): number {
        return Math.ceil(seconds / 3600);
    }

    public static yearMonth(): string {
        const date = new Date();

        const y = date.getFullYear().toString();

        let m = date.getMonth().toString();
        if (m.length < 2) m = `0${m}`;

        let d = date.getDate().toString();
        if (d.length < 2) d = `0${d}`;

        const h = date.getHours().toString();

        return `${y}.${m}.${d}:${h}`;
    }

    public static timeStamp() {
        return Date.parse(new Date().toString());
    }
}

export namespace UtilActor {
    let ray: geometry.Ray;

    const slopNormal = v3(0, 0, 0);

    const quat = new Quat(0, 0, 0, 1);

    const V3Down = v3(0, -1, 0);

    const tempVec3 = v3(0, 0, 0);

    export function calculateSlope(node: Node, velocity: Vec3, distance = 0.3, mask = 1) {
        if (ray == undefined) ray = new geometry.Ray();

        Vec3.copy(ray.o, node.worldPosition);
        Vec3.copy(ray.d, V3Down);

        if (PhysicsSystem.instance.raycastClosest(ray, mask, distance)) {
            const result = PhysicsSystem.instance.raycastClosestResult;
            Quat.rotationTo(quat, Vec3.UP, result.hitNormal);
            Vec3.transformQuat(tempVec3, velocity, quat);
            //if(tempVec3.y < 0) {
            Vec3.copy(velocity, tempVec3);
            //}
            //Gizmo.drawLine(this.node.worldPosition, )
        }
    }
}

export namespace UtilTmp {
    export const Ray = new geometry.Ray();

    export const V3_0 = v3(0, 0, 0);
    export const V3_1 = v3(0, 0, 0);
    export const V3_2 = v3(0, 0, 0);

    export const Quat_0 = new Quat();
    export const Quat_1 = new Quat();
    export const Quat_2 = new Quat();

    export const Mat4_0 = new Mat4();
    export const Mat4_1 = new Mat4();
    export const Mat4_2 = new Mat4();
}

export namespace Const {
    export const V3Up = v3(0, 1, 0);
    export const V3Down = v3(0, -1, 0);
    export const V3Left = v3(-1, 0, 0);
    export const V3Right = v3(1, 0, 0);
    export const V3Forward = v3(0, 0, -1);
    export const V3Back = v3(0, 0, 1);

    export const QUAT0 = quat(0, 0, 0, 1);
}
