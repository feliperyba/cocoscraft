import { _decorator, CCInteger, Component, Vec2 } from 'cc';

import { BlockType } from './blocks';

const { ccclass, property, type } = _decorator;

@ccclass('TextureData')
export class TextureData {
    @property({ type: CCInteger })
    blockType: BlockType = BlockType.Empty;

    @property
    up: Vec2 = new Vec2();

    @property
    down: Vec2 = new Vec2();

    @property
    side: Vec2 = new Vec2();

    @property
    isPrefab: boolean = false;

    @property
    isSolid: boolean = false;

    @property
    generatesCollider: boolean = false;
}

// this is quite an strange way to type the array, but it works on the editor
@ccclass('TextureDataWrapper')
export class TextureDataWrapper extends Component {
    @type(TextureData)
    textureData!: TextureData;
}
