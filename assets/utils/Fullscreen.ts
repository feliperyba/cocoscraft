import { _decorator, Component, game, view } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('Fullscreen')
export class Fullscreen extends Component {
    @property
    autoFullscreenOnClick = true;

    start(): void {
        this.fixDOM();

        game.canvas?.addEventListener('click', this.onCanvasClick, false);
        document.addEventListener('fullscreenchange', this.onFullscreenChange, false);
    }

    private fixDOM(): void {
        document.documentElement.style.cssText += ';width:100%;height:100%;overflow:hidden;margin:0;padding:0;';
        document.body.style.cssText += ';width:100%;height:100%;overflow:hidden;margin:0;padding:0;text-align:left;background:#000;';

        const gameDiv = document.getElementById('GameDiv');
        if (gameDiv) {
            gameDiv.style.cssText = 'width:100%;height:100%;margin:0;border:none;border-radius:0;box-shadow:none;padding:0;position:relative;';
            gameDiv.removeAttribute('cc_exact_fit_screen');
        }

        const header = document.querySelector('h1.header') as HTMLElement | null;
        if (header) header.style.display = 'none';

        const footer = document.querySelector('p.footer') as HTMLElement | null;
        if (footer) footer.style.display = 'none';

        const content = document.querySelector('.content') as HTMLElement | null;
        if (content) content.style.cssText += ';width:100%;height:100%;flex:1;';

        const contentWrap = document.querySelector('.contentWrap') as HTMLElement | null;
        if (contentWrap) contentWrap.style.cssText += ';width:100%;height:100%;';
    }

    private onCanvasClick = (): void => {
        if (!this.autoFullscreenOnClick) return;
        if (!document.fullscreenElement) {
            const active = document.activeElement as HTMLElement | null;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
            this.requestFullscreen();
        }
    };

    private getFullscreenTarget(): HTMLElement {
        return document.getElementById('Cocos3dGameContainer')
            || document.getElementById('GameDiv')
            || game.canvas!;
    }

    private requestFullscreen(): void {
        const target = this.getFullscreenTarget();
        if (target.requestFullscreen) {
            target.requestFullscreen();
        } else if ((target as any).webkitRequestFullscreen) {
            (target as any).webkitRequestFullscreen();
        } else if ((target as any).msRequestFullscreen) {
            (target as any).msRequestFullscreen();
        }
    }

    exitFullscreen(): void {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }

    toggleFullscreen(): void {
        if (document.fullscreenElement) {
            this.exitFullscreen();
        } else {
            this.requestFullscreen();
        }
    }

    private onFullscreenChange = (): void => {
    };

    onDestroy(): void {
        game.canvas?.removeEventListener('click', this.onCanvasClick, false);
        document.removeEventListener('fullscreenchange', this.onFullscreenChange, false);
    }
}
