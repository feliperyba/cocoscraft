import { NoiseSettings } from '../models/noiseSettings';
import { simplexNoise } from './simplexNoise';

export const remapValue = (value: number, outputMin: number, outputMax: number): number => {
    return Math.floor(outputMin + ((value - 0) * (outputMax - outputMin)) / (1 - 0));
};

export const redistribution = (noise: number, settings: NoiseSettings): number => {
    return Math.pow(noise * settings.redistributionModifier, settings.exponent);
};

export const octavePerlin = (x: number, z: number, settings: NoiseSettings): number => {
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
                (settings.offset.y + settings.worldOffset.y + z) * frequency
            ) * amplitude;

        amplitudeSum += amplitude;

        amplitude *= settings.persistance;
        frequency *= 2;
    }

    return total / amplitudeSum;
};
