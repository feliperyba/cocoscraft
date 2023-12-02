import { _decorator, Component } from 'cc';

import BlockDataSO from '../models/blocks';

const { ccclass } = _decorator;

@ccclass('BlockDataCreator')
export class BlockDataCreator extends Component {
    start(): void {
        this.node.on('CreateBlockData', this.createBlockData, this);
    }

    createBlockData(): void {
        // Create a new BlockDataSO instance here
        const blockData = new BlockDataSO();
        console.log('BlockData created', blockData);
    }
}
