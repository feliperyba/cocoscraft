import { _decorator, Component, director, Node, ResolutionPolicy, view } from 'cc';

import { WaterLayer } from '@/scripts/map/layers/waterLayer';

import { World } from '../scripts/map/world';
import { eGroup } from './easyMenu/src/eGroup';
import { eMenu } from './easyMenu/src/eMenu';
import { GameManager } from './gameManager';
const { ccclass, property, type } = _decorator;

@ccclass('VoxelDebug')
export class VoxelDebug extends Component {
    @type(eMenu)
    easyMenu!: eMenu;

    @type(World)
    worldReferece!: World;

    @property(Node)
    postReference!: Node;

    @type(GameManager)
    gameManager!: GameManager;

    group!: eGroup;

    onLoad(): void {
        const noiseSettings = this.worldReferece.terrainGenerator.biomeGenerator.noiseSettings;

        this.group = this.easyMenu.addGroup('Debug');

        this.group.addItem('Reset Voxel Scene', () => {
            director.loadScene('voxel-map');
        });

        /*this.group.addItem('Go to PhysX Scene', () => {
            director.loadScene('main');
        });*/

        const group2 = this.group.addGroup('World Seed');

        group2.addEdit('Seed X', this.worldReferece.seedOffSet.x, value => {
            this.worldReferece.seedOffSet.x = Number(value);
        });

        group2.addEdit('Seed Y', this.worldReferece.seedOffSet.y, value => {
            this.worldReferece.seedOffSet.y = Number(value);
        });

        this.group.addEdit('Map Size', this.worldReferece.mapSizeInChunks, value => {
            this.worldReferece.mapSizeInChunks = Number(value);
        });

        this.group.addEdit('Chunk Size', this.worldReferece.chunkSize, value => {
            this.worldReferece.chunkSize = Number(value);
        });

        this.group.addEdit('Chunk Height', this.worldReferece.chunkHeight, value => {
            this.worldReferece.chunkHeight = Number(value);
        });

        const waterLayer = this.worldReferece.terrainGenerator.biomeGenerator.getComponentInChildren(
            'WaterLayer'
        )! as WaterLayer;

        this.group.addEdit('Water Threshold', waterLayer.waterLevel, value => {
            waterLayer.waterLevel = Number(value);
        });

        this.group.addEdit('Redistribution Modifier', noiseSettings.redistributionModifier, value => {
            noiseSettings.redistributionModifier = Number(value);
        });

        this.group.addEdit('Noise Zoom', noiseSettings.noiseZoom, value => {
            noiseSettings.noiseZoom = Number(value);
        });

        this.group.addEdit('Persistance', noiseSettings.persistance, value => {
            noiseSettings.persistance = Number(value);
        });

        this.group.addEdit('Exponent', noiseSettings.exponent, value => {
            noiseSettings.exponent = Number(value);
        });

        this.group.addEdit('Octaves', noiseSettings.octaves, value => {
            noiseSettings.octaves = Number(value);
        });

        this.group.addToggle(
            'Post Processing',
            (value: boolean) => {
                this.postReference.active = value;
            },
            false
        );

        this.group.addItem('Spawn Player', () => {
            this.gameManager.spawnPlayer();
        });

        /*this.makeResponsive();
        window.addEventListener('resize', () => {
            this.makeResponsive();
        });*/
    }

    makeResponsive(): void {
        /**
         * Apply a resolution policy to the design resolution size, which will dynamically adapt to the screen container
         * without losing the original aspect ratio. This will allow the game to be played on any device with any screen
         *
         * const designResolution = view.getDesignResolutionSize();
         * view.setDesignResolutionSize(designResolution.width, designResolution.height, ResolutionPolicy.EXACT_FIT);
         */

        const resolutionPolicy = view.getResolutionPolicy();

        const designResolution = view.getDesignResolutionSize();
        const desiredRatio = designResolution.width / designResolution.height;
        const deviceRatio = screen.width / screen.height;

        if (deviceRatio >= desiredRatio) {
            resolutionPolicy.setContentStrategy(ResolutionPolicy.ContentStrategy.FIXED_HEIGHT);
        }

        if (deviceRatio <= desiredRatio) {
            resolutionPolicy.setContentStrategy(ResolutionPolicy.ContentStrategy.FIXED_WIDTH);
        }

        view.setResolutionPolicy(resolutionPolicy);
    }
}
