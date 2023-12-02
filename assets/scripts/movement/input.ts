/* eslint-disable complexity */
import { director, EventKeyboard, Game, game, Input, input, KeyCode } from 'cc';

class InputMap {
    key = {
        left: false,
        right: false,
        up: false,
        down: false,
        space: false,
        shift: false,
        f: false,
        g: false,
        c: false,
    };

    rotation = 0;
    balls = null;

    registerEvents(): void {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    onKeyDown(event: EventKeyboard): void {
        switch (event.keyCode) {
            case KeyCode.ARROW_LEFT:
            case KeyCode.KEY_A:
                this.key.left = true;
                break;
            case KeyCode.ARROW_RIGHT:
            case KeyCode.KEY_D:
                this.key.right = true;
                break;
            case KeyCode.ARROW_UP:
            case KeyCode.KEY_W:
                this.key.up = true;
                break;
            case KeyCode.ARROW_DOWN:
            case KeyCode.KEY_S:
                this.key.down = true;
                break;
            case KeyCode.SPACE:
                this.key.space = true;
                break;
            case KeyCode.SHIFT_LEFT:
            case KeyCode.SHIFT_RIGHT:
                this.key.shift = true;
                break;
            case KeyCode.KEY_C:
                this.key.c = true;
                break;
            case KeyCode.KEY_F:
                this.balls = director.getScene().getChildByName('Balls');
                this.balls.active = !this.balls.active;
                this.key.f = true;
                break;
            case KeyCode.KEY_G:
                this.key.g = true;
                break;
        }
    }

    onKeyUp(event: EventKeyboard): void {
        switch (event.keyCode) {
            case KeyCode.ARROW_LEFT:
            case KeyCode.KEY_A:
                this.key.left = false;
                break;
            case KeyCode.ARROW_RIGHT:
            case KeyCode.KEY_D:
                this.key.right = false;
                break;
            case KeyCode.ARROW_UP:
            case KeyCode.KEY_W:
                this.key.up = false;
                break;
            case KeyCode.ARROW_DOWN:
            case KeyCode.KEY_S:
                this.key.down = false;
                break;
            case KeyCode.SPACE:
                this.key.space = false;
                break;
            case KeyCode.SHIFT_LEFT:
            case KeyCode.SHIFT_RIGHT:
                this.key.shift = false;
                break;
            case KeyCode.KEY_C:
                this.key.c = false;
                break;
            case KeyCode.KEY_F:
                this.key.f = false;
                break;
            case KeyCode.KEY_G:
                this.key.g = false;
                break;
        }
    }
}

const inputMap = new InputMap();

game.on(Game.EVENT_GAME_INITED, () => {
    inputMap.registerEvents();
});

export default inputMap;
