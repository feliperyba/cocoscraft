export interface Vec2Like {
    x: number;
    y: number;
}

export interface NoiseSettingsLike {
    redistributionModifier: number;
    noiseZoom: number;
    persistance: number;
    exponent: number;
    octaves: number;
    offset: Vec2Like;
    worldOffset: Vec2Like;
}

export interface DomainWarpingSettingsLike {
    noiseDomainX: NoiseSettingsLike;
    noiseDomainY: NoiseSettingsLike;
    amplitudeX: number;
    amplitudeY: number;
}

export const simplexNoise = (xin: number, yin: number, perm: number[], grad3: number[][]): number => {
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

    let n0, n1, n2;
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;
    let i1, j1;
    if (x0 > y0) {
        i1 = 1;
        j1 = 0;
    } else {
        i1 = 0;
        j1 = 1;
    }
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;
    const ii = i & 255;
    const jj = j & 255;
    const gi0 = perm[ii + perm[jj]] % 12;
    const gi1 = perm[ii + i1 + perm[jj + j1]] % 12;
    const gi2 = perm[ii + 1 + perm[jj + 1]] % 12;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) n0 = 0.0;
    else {
        t0 *= t0;
        n0 = t0 * t0 * (grad3[gi0][0] * x0 + grad3[gi0][1] * y0);
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) n1 = 0.0;
    else {
        t1 *= t1;
        n1 = t1 * t1 * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1);
    }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) n2 = 0.0;
    else {
        t2 *= t2;
        n2 = t2 * t2 * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2);
    }

    return 70.0 * (n0 + n1 + n2);
};

export const octavePerlin = (
    x: number,
    z: number,
    settings: NoiseSettingsLike,
    perm: number[],
    grad3: number[][]
): number => {
    x *= settings.noiseZoom;
    z *= settings.noiseZoom;
    x += settings.noiseZoom;
    z += settings.noiseZoom;

    let total = 0;
    let frequency = 0.35;
    let amplitude = 0.35;
    let amplitudeSum = 0;

    for (let i = 0; i < settings.octaves; i++) {
        total +=
            simplexNoise(
                (settings.offset.x + settings.worldOffset.x + x) * frequency,
                (settings.offset.y + settings.worldOffset.y + z) * frequency,
                perm,
                grad3
            ) * amplitude;

        amplitudeSum += amplitude;

        amplitude *= settings.persistance;
        frequency *= 2;
    }

    return total / amplitudeSum;
};

export const remapValue = (value: number, outputMin: number, outputMax: number): number => {
    return Math.floor(outputMin + ((value - 0) * (outputMax - outputMin)) / (1 - 0));
};

export const redistribution = (noise: number, settings: NoiseSettingsLike): number => {
    return Math.pow(noise * settings.redistributionModifier, settings.exponent);
};

export const generateDomainOffset = (
    x: number,
    z: number,
    settings: DomainWarpingSettingsLike,
    perm: number[],
    grad3: number[][]
): Vec2Like => {
    const noiseX = octavePerlin(x, z, settings.noiseDomainX, perm, grad3) * settings.amplitudeX;
    const noiseY = octavePerlin(x, z, settings.noiseDomainY, perm, grad3) * settings.amplitudeY;

    return { x: noiseX, y: noiseY };
};

export const generateDomainNoise = (
    x: number,
    z: number,
    defaultNoiseSettings: NoiseSettingsLike,
    domainSettings: DomainWarpingSettingsLike,
    perm: number[],
    grad3: number[][]
): number => {
    const domainOffset = generateDomainOffset(x, z, domainSettings, perm, grad3);
    return octavePerlin(x + domainOffset.x, z + domainOffset.y, defaultNoiseSettings, perm, grad3);
};
