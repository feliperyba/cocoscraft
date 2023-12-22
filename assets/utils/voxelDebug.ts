import { _decorator, Component, director, Node, ResolutionPolicy, view } from 'cc';

import { CharacterFps } from '../scripts/character/charFps';
import { WaterLayer } from '../scripts/map/layers/waterLayer';
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

    postReferenceActive = this.postReference;

    onLoad(): void {
        const noiseSettings = this.worldReferece.terrainGenerator.biomeGenerator.noiseSettings;

        this.group = this.easyMenu.addGroup('Debug');

        this.group.addItem('Reset Voxel Scene', () => {
            director.loadScene('voxel-map');
        });

        const group2 = this.group.addGroup('World Seed');

        group2.addEdit('Seed X', this.worldReferece.seedOffSet.x, value => {
            this.worldReferece.seedOffSet.x = Number(value);
        });

        group2.addEdit('Seed Y', this.worldReferece.seedOffSet.y, value => {
            this.worldReferece.seedOffSet.y = Number(value);
        });

        group2.addEdit('Chunk Drawing Range', this.worldReferece.chunkDrawingRange, value => {
            this.worldReferece.chunkDrawingRange = Number(value);
        });

        group2.addEdit('Chunk Size', this.worldReferece.chunkSize, value => {
            this.worldReferece.chunkSize = Number(value);
        });

        group2.addEdit('Chunk Height', this.worldReferece.chunkHeight, value => {
            this.worldReferece.chunkHeight = Number(value);
        });

        const waterLayer = this.worldReferece.terrainGenerator.biomeGenerator.getComponentInChildren(
            'WaterLayer'
        )! as WaterLayer;

        group2.addEdit('Water Threshold', waterLayer.waterLevel, value => {
            waterLayer.waterLevel = Number(value);
        });

        group2.addEdit('Redistribution Modifier', noiseSettings.redistributionModifier, value => {
            noiseSettings.redistributionModifier = Number(value);
        });

        group2.addEdit('Noise Zoom', noiseSettings.noiseZoom, value => {
            noiseSettings.noiseZoom = Number(value);
        });

        group2.addEdit('Persistance', noiseSettings.persistance, value => {
            noiseSettings.persistance = Number(value);
        });

        group2.addEdit('Exponent', noiseSettings.exponent, value => {
            noiseSettings.exponent = Number(value);
        });

        group2.addEdit('Octaves', noiseSettings.octaves, value => {
            noiseSettings.octaves = Number(value);
        });

        const group3 = this.group.addGroup('Post Processing');

        group3.addToggle(
            'Enable',
            (value: boolean) => {
                this.postReferenceActive.active = value;
            },
            false
        );

        group3.addToggle(
            'FSR',
            (value: boolean) => {
                this.postReferenceActive.getComponent('cc.FSR')!.enabled = value;
            },
            true
        );

        group3.addToggle(
            'TAA',
            (value: boolean) => {
                this.postReferenceActive.getComponent('cc.TAA')!.enabled = value;
            },
            true
        );

        group3.addToggle(
            'FXAA',
            (value: boolean) => {
                this.postReferenceActive.getComponent('cc.FXAA')!.enabled = value;
            },
            true
        );

        group3.addToggle(
            'Bloom',
            (value: boolean) => {
                this.postReferenceActive.getComponent('cc.Bloom')!.enabled = value;
            },
            true
        );

        group3.addToggle(
            'LUT',
            (value: boolean) => {
                this.postReferenceActive.getComponent('cc.ColorGrading')!.enabled = value;
            },
            true
        );

        group3.addToggle(
            'HBAO',
            (value: boolean) => {
                this.postReferenceActive.getComponent('cc.HBAO')!.enabled = value;
            },
            true
        );

        this.group.addItem('Spawn Player', () => {
            this.gameManager.spawnPlayer(this.postReference);
        });

        /*this.makeResponsive();
        window.addEventListener('resize', () => {
            this.makeResponsive();
        });*/
    }

    protected update(): void {
        this.postReferenceActive = this.gameManager.playerInstance
            ? this.gameManager.playerInstance.getComponentInChildren(CharacterFps)!.camera.postProcess!
            : this.postReference;
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
