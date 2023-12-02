import { _decorator, Component } from 'cc';

import { TextureDataWrapper } from './textureData';

const { ccclass, property } = _decorator;

@ccclass('BlockDataSO')
export default class BlockDataSO extends Component {
    @property
    textureSizeX: number = 0;

    @property
    textureSizeY: number = 0;

    // this is quite an strange way to type the array, but it works on the editor
    @property({ type: [TextureDataWrapper] })
    textureDataList: TextureDataWrapper[] = [];
}
