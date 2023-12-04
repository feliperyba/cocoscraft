import { _decorator, Component, director, Node } from 'cc';
import { ResolutionPolicy, view } from 'cc';

import { eGroup } from './easyMenu/src/eGroup';
import { eMenu } from './easyMenu/src/eMenu';
const { ccclass, property, type } = _decorator;

@ccclass('PhysxDebug')
export class PhysxDebug extends Component {
    @type(eMenu)
    easyMenu!: eMenu;

    @property(Node)
    postReference!: Node;

    group: eGroup;

    onLoad(): void {
        this.group = this.easyMenu.addGroup('Debug');

        this.group.addItem('Reset PhysX Scene', () => {
            director.loadScene('main');
        });
        this.group.addItem('Go to Voxel Scene', () => {
            director.loadScene('voxel-map');
        });

        this.group.addToggle('Post Processing', value => {
            this.postReference.active = value;
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
