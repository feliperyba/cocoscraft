import { Vec3 } from 'cc';

import { BlockDirection } from '../models';

const directionVectors = {
    [BlockDirection.Up]: Vec3.UP,
    [BlockDirection.Down]: Vec3.UP.clone().negative(),
    [BlockDirection.Right]: Vec3.RIGHT,
    [BlockDirection.Left]: Vec3.RIGHT.clone().negative(),
    [BlockDirection.Forward]: Vec3.FORWARD,
    [BlockDirection.Back]: Vec3.FORWARD.clone().negative(),
};

export const getVector = (direction: BlockDirection): Vec3 => {
    if (!directionVectors[direction]) throw new Error('Invalid input direction');
    return directionVectors[direction];
};
