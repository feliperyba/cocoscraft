// Define permutation table
// this was taken from https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83
const p = new Uint8Array([
    151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240,
    21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88,
    237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83,
    111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80,
    73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64,
    52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182,
    189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22,
    39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228, 251, 34, 193, 238, 210, 144,
    12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204,
    176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66,
    215, 61, 156, 180,
]);

// Define gradient vectors
const grad3 = new Float32Array([
    1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, -1, -1,
]);

function noise(x: number, y: number): number {
    let X = Math.floor(x),
        Y = Math.floor(y);
    // Get relative xy coordinates of point within that cell
    x = x - X;
    y = y - Y;
    // Wrap the integer cells at 255 (smaller integer period can be introduced here)
    X = X & 255;
    Y = Y & 255;
    // Calculate noise contributions from each of the four corners
    const n00 = grad3[p[X + p[Y]] % 12] * x + grad3[(p[X + p[Y]] % 12) + 1] * y;
    const n01 = grad3[p[X + p[Y + 1]] % 12] * x + grad3[(p[X + p[Y + 1]] % 12) + 1] * (y - 1);
    const n10 = grad3[p[X + 1 + p[Y]] % 12] * (x - 1) + grad3[(p[X + 1 + p[Y]] % 12) + 1] * y;
    const n11 = grad3[p[X + 1 + p[Y + 1]] % 12] * (x - 1) + grad3[(p[X + 1 + p[Y + 1]] % 12) + 1] * (y - 1);
    // Compute the fade curve value for x
    const u = fade(x);
    // Interpolate the four results
    return lerp(lerp(n00, n10, u), lerp(n01, n11, u), fade(y));
}

// Fade function as defined by Ken Perlin
function fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
}

// Linear interpolation function
function lerp(a: number, b: number, t: number): number {
    return (1 - t) * a + t * b;
}

const settings = {
    redistributionModifier: 1.2,
    exponent: 4,
    noiseZoom: 0.01,
    octaves: 5,
    persistance: 0.5,
};

export const simplePerlinNoise = (x: number, z: number): number => {
    x *= settings.noiseZoom;
    z *= settings.noiseZoom;
    x += settings.noiseZoom;
    z += settings.noiseZoom;

    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let amplitudeSum = 0;
    for (let i = 0; i < settings.octaves; i++) {
        total += noise(x * frequency, z * frequency) * amplitude;

        amplitudeSum += amplitude;

        amplitude *= settings.persistance;
        frequency *= 2;
    }

    return total / amplitudeSum;
};
