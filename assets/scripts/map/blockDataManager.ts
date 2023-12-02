import { _decorator, Component } from 'cc';

import { BlockDataSO, BlockType, TextureData } from './models';

const { ccclass, property } = _decorator;

@ccclass('BlockDataManager')
export class BlockDataManager extends Component {
    static textureOffset: number = 0.001;
    static tileSizeX: number;
    static tileSizeY: number;
    static blockTextureDataDictionary: Map<BlockType, TextureData> = new Map();

    @property(BlockDataSO)
    textureData!: BlockDataSO;

    start(): void {
        this.textureData.textureDataList.forEach(item => {
            if (!BlockDataManager.blockTextureDataDictionary.has(item.textureData.blockType)) {
                BlockDataManager.blockTextureDataDictionary.set(item.textureData.blockType, item.textureData);
            }
        });

        BlockDataManager.tileSizeX = this.textureData.textureSizeX;
        BlockDataManager.tileSizeY = this.textureData.textureSizeY;
    }
}
