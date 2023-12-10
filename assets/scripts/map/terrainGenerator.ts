import { _decorator, Component, Vec2 } from 'cc';

import { BiomeGenerator } from './biomeGenerator';
import { ChunkData } from './chunkData';
const { ccclass, type } = _decorator;

@ccclass('TerrainGenerator')
export class TerrainGenerator extends Component {
    @type(BiomeGenerator)
    biomeGenerator!: BiomeGenerator;

    generateChunkData(data: ChunkData, seedOffSet: Vec2): ChunkData {
        for (let x = 0; x < data.chunkSize; x++) {
            for (let z = 0; z < data.chunkSize; z++) {
                this.biomeGenerator.generateColumnVoxels(data, x, z, seedOffSet);
            }
        }

        return data;
    }
}
