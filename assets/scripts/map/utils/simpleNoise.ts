// Simplest possible Perlin noise implementation for the sake of example.
export const simplePerlinNoise = (x: number, y: number): number => {
    return Math.sin(Math.sqrt(x * x + y * y));
};
