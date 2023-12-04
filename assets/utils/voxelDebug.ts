import { _decorator, Component, Node } from 'cc';

import { World } from '../scripts/map/world';
import { eGroup } from './easyMenu/src/eGroup';
import { eMenu } from './easyMenu/src/eMenu';
const { ccclass, property, type } = _decorator;

@ccclass('VoxelDebug')
export class VoxelDebug extends Component {
    @type(eMenu)
    easyMenu!: eMenu;

    @type(World)
    worldReferece!: World;

    @property(Node)
    postReference!: Node;

    group: eGroup;

    onLoad(): void {
        this.group = this.easyMenu.addGroup('Debug');

        this.group.addEdit('Map Size', this.worldReferece.mapSizeInChunks, value => {
            this.worldReferece.mapSizeInChunks = Number(value);
        });

        this.group.addEdit('Chunk Size', this.worldReferece.chunkSize, value => {
            this.worldReferece.chunkSize = Number(value);
        });

        this.group.addEdit('Chunk Height', this.worldReferece.chunkHeight, value => {
            this.worldReferece.chunkHeight = Number(value);
        });

        this.group.addEdit('Water Threshold', this.worldReferece.waterThreshold, value => {
            this.worldReferece.waterThreshold = Number(value);
        });

        this.group.addEdit('Noise Scale', this.worldReferece.noiseScale, value => {
            this.worldReferece.noiseScale = Number(value);
        });

        this.group.addToggle('Post Processing', value => {
            this.postReference.active = value;
        });
    }

    start(): void {}
}
