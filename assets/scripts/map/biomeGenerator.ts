import { _decorator, Component, Vec2 } from 'cc';

import { ChunkData } from './chunkData';
import { DomainWarping } from './domainWarping';
import { LayerHandler } from './layers/layerHandler';
import { NoiseSettings } from './models/noiseSettings';
import { octavePerlin, redistribution, remapValue } from './utils/sunnyNoise';
const { ccclass, property, type } = _decorator;

@ccclass('BiomeGenerator')
export class BiomeGenerator extends Component {
    @type(NoiseSettings)
    noiseSettings = new NoiseSettings();

    @property
    useDomainWarping = true;

    @type(DomainWarping)
    domainWarping: DomainWarping = new DomainWarping();

    @type(LayerHandler)
    startingLayerHandler!: LayerHandler;

    @type(Array(LayerHandler))
    detailLayerHandlers: LayerHandler[] = [];

    generateColumnVoxels(data: ChunkData, x: number, z: number, seedOffSet: Vec2): void {
        this.noiseSettings.worldOffset = seedOffSet;

        const groundPosition = this.getSurfaceHeightNoise(
            data.worldPosition.x + x,
            data.worldPosition.z + z,
            data.chunkHeight
        );

        for (let y = 0; y < data.chunkHeight; y++) {
            this.startingLayerHandler.handleLayer({
                chunkData: data,
                x,
                y,
                z,
                surfaceHeightNoise: groundPosition,
                mapSeedOffset: seedOffSet,
            });
        }

        for (const layerHandler of this.detailLayerHandlers) {
            layerHandler.handleLayer({
                chunkData: data,
                x,
                y: data.worldPosition.y,
                z,
                surfaceHeightNoise: groundPosition,
                mapSeedOffset: seedOffSet,
            });
        }
    }

    private getSurfaceHeightNoise(x: number, z: number, chunkHeight: number): number {
        let terrainHeight = !this.useDomainWarping
            ? octavePerlin(x, z, this.noiseSettings)
            : this.domainWarping.generateDomainNoise(x, z, this.noiseSettings);

        terrainHeight = redistribution(terrainHeight, this.noiseSettings);

        return remapValue(terrainHeight, 0, chunkHeight);
    }
}
