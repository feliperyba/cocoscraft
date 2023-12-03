import { Vec3 } from 'cc';

import { BlockDirection } from '../models';

export function getVector(direction: BlockDirection): Vec3 {
    switch (direction) {
        case BlockDirection.Forward:
            return new Vec3(0, 0, 1);
        case BlockDirection.Back:
            return new Vec3(0, 0, -1);
        case BlockDirection.Right:
            return new Vec3(1, 0, 0);
        case BlockDirection.Left:
            return new Vec3(-1, 0, 0);
        case BlockDirection.Up:
            return new Vec3(0, 1, 0);
        case BlockDirection.Down:
            return new Vec3(0, -1, 0);
        default:
            return new Vec3(0, 0, 0);
    }
}
