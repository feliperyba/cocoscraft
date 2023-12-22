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

    protected update(): void {
        this.postReferenceActive = this.gameManager.playerInstance
            ? this.gameManager.playerInstance.getComponentInChildren(CharacterFps)!.camera.postProcess!
            : this.postReference;
    }

    onLoad(): void {
        const noiseSettings = this.worldReferece.terrainGenerator.biomeGenerator.noiseSettings;

        this.group = this.easyMenu.addGroup('Debug');

        this.group.addItem('Reset Voxel Scene', () => {
            director.loadScene('voxel-map');
        });

        // #region World Seed
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

        group2.changeVisible();
        //#endregion

        //#region Domain Warping
        const domainGroup = this.group.addGroup('Domain Warping');
        const domainConfig = this.worldReferece.terrainGenerator.biomeGenerator.domainWarping;

        domainGroup.addToggle(
            'Enable',
            (value: boolean) => {
                this.worldReferece.terrainGenerator.biomeGenerator.useDomainWarping = value;
            },
            true
        );

        domainGroup.addEdit('Amplitude X', domainConfig.amplitudeX, value => {
            domainConfig.amplitudeX = Number(value);
        });

        domainGroup.addEdit('Amplitude Y', domainConfig.amplitudeY, value => {
            domainConfig.amplitudeY = Number(value);
        });

        const domainXGroup = domainGroup.addGroup('Domain X');
        domainXGroup.addEdit('Redistribution Modifier', domainConfig.noiseDomainX.redistributionModifier, value => {
            domainConfig.noiseDomainX.redistributionModifier = Number(value);
        });

        domainXGroup.addEdit('Noise Zoom', domainConfig.noiseDomainX.noiseZoom, value => {
            domainConfig.noiseDomainX.noiseZoom = Number(value);
        });

        domainXGroup.addEdit('Persistance', domainConfig.noiseDomainX.persistance, value => {
            domainConfig.noiseDomainX.persistance = Number(value);
        });

        domainXGroup.addEdit('Exponent', domainConfig.noiseDomainX.exponent, value => {
            domainConfig.noiseDomainX.exponent = Number(value);
        });

        domainXGroup.addEdit('Octaves', domainConfig.noiseDomainX.octaves, value => {
            domainConfig.noiseDomainX.octaves = Number(value);
        });

        domainXGroup.addEdit('Offset X', domainConfig.noiseDomainX.offset.x, value => {
            domainConfig.noiseDomainX.offset.x = Number(value);
        });

        domainXGroup.addEdit('Offset Y', domainConfig.noiseDomainX.offset.y, value => {
            domainConfig.noiseDomainX.offset.y = Number(value);
        });

        domainXGroup.addEdit('World Offset X', domainConfig.noiseDomainX.worldOffset.x, value => {
            domainConfig.noiseDomainX.worldOffset.x = Number(value);
        });

        domainXGroup.addEdit('World Offset Y', domainConfig.noiseDomainX.worldOffset.y, value => {
            domainConfig.noiseDomainX.worldOffset.y = Number(value);
        });
        domainXGroup.changeVisible();

        const domainYGroup = domainGroup.addGroup('Domain Y');
        domainYGroup.addEdit('Redistribution Modifier', domainConfig.noiseDomainY.redistributionModifier, value => {
            domainConfig.noiseDomainY.redistributionModifier = Number(value);
        });

        domainYGroup.addEdit('Noise Zoom', domainConfig.noiseDomainY.noiseZoom, value => {
            domainConfig.noiseDomainY.noiseZoom = Number(value);
        });

        domainYGroup.addEdit('Persistance', domainConfig.noiseDomainY.persistance, value => {
            domainConfig.noiseDomainY.persistance = Number(value);
        });

        domainYGroup.addEdit('Exponent', domainConfig.noiseDomainY.exponent, value => {
            domainConfig.noiseDomainY.exponent = Number(value);
        });

        domainYGroup.addEdit('Octaves', domainConfig.noiseDomainY.octaves, value => {
            domainConfig.noiseDomainY.octaves = Number(value);
        });

        domainYGroup.addEdit('Offset X', domainConfig.noiseDomainY.offset.x, value => {
            domainConfig.noiseDomainY.offset.x = Number(value);
        });

        domainYGroup.addEdit('Offset Y', domainConfig.noiseDomainY.offset.y, value => {
            domainConfig.noiseDomainY.offset.y = Number(value);
        });

        domainYGroup.addEdit('World Offset X', domainConfig.noiseDomainY.worldOffset.x, value => {
            domainConfig.noiseDomainY.worldOffset.x = Number(value);
        });

        domainYGroup.addEdit('World Offset Y', domainConfig.noiseDomainY.worldOffset.y, value => {
            domainConfig.noiseDomainY.worldOffset.y = Number(value);
        });
        domainYGroup.changeVisible();

        domainGroup.changeVisible();
        //#endregion

        //#region Post Processing
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
        group3.changeVisible();
        //#endregion

        this.group.addItem('Spawn Player', () => {
            this.gameManager.spawnPlayer(this.postReference);
        });

        this.makeResponsive();
        window.addEventListener('resize', () => {
            this.makeResponsive();
        });
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
