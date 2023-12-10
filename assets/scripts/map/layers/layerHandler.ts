/**
 * Implementation of Chain of Responsibility pattern for handling layers.
 * @see https://refactoring.guru/design-patterns/chain-of-responsibility
 */

import { _decorator, Component, Vec2 } from 'cc';

import { ChunkData } from '../chunkData';
const { ccclass, type } = _decorator;

export type LayerParams = {
    chunkData: ChunkData;
    x: number;
    y: number;
    z: number;
    surfaceHeightNoise: number;
    mapSeedOffset: Vec2;
};

@ccclass('LayerHandler')
export abstract class LayerHandler extends Component {
    @type(LayerHandler)
    nextHandler?: LayerHandler;

    handleLayer(params: LayerParams): boolean {
        if (this.tryHandling(params)) return true;
        if (this.nextHandler) return this.nextHandler.handleLayer(params);

        return false;
    }

    protected abstract tryHandling(params: LayerParams): boolean;
}
