import { _decorator } from 'cc';

import { ChunkData } from './chunkData';
import { MeshData } from './meshData';
const { ccclass } = _decorator;

@ccclass('Chunk')
export class Chunk {
    static getMeshData(chunkData: ChunkData): MeshData {
        return { chunkData } as any as MeshData;
    }
}
