import { Vec3 } from 'cc';

export const parseToVec3 = (str: string): Vec3 => {
    const [x, y, z] = str.split(',').map(Number);
    return new Vec3(x, y, z);
};

/**
 * We are doing it to optmize the map set index performance to avoid string comparison
 * With this algorithm we can get a numeric index hashing the Vec3 position of a chunk
 */
export const parseVec3ToInt = (pos: Vec3): number => {
    const { x, y, z } = pos;
    const k1 = cantorPair(x, y);

    return cantorPair(k1, z);
};

/**
 * @see https://www.cantorsparadise.com/cantor-pairing-function-e213a8a89c2b
 */
export const cantorPair = (k1: number, k2: number): number => {
    return 0.5 * (k1 + k2) * (k1 + k2 + 1) + k2;
};
