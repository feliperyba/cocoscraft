import { _decorator, Component } from 'cc';

import { BlockDataSO } from '../models';

const { ccclass } = _decorator;

@ccclass('BlockDataCreator')
export class BlockDataCreator extends Component {
    start(): void {
        this.node.on('CreateBlockData', this.createBlockData, this);
    }

    createBlockData(): void {
        const blockData = new BlockDataSO();
        console.log('BlockData created', blockData);
    }
}
