import { isPanelOnLeft } from "../UI/UIHelper";
import { routeTo } from "../UI/UISystem";
import { MAP } from "./Logic/Logic";

const { ccclass, property } = cc._decorator;

const PIN_COLOR = cc.color().fromHEX("#EF5350");

@ccclass
export default class WorldTile extends cc.Component {
    @property(cc.Camera) protected camera: cc.Camera = null;
    @property(cc.Node) protected cities: cc.Node = null;
    protected override start() {
        this.cities.children.forEach((c) => {
            c.color = PIN_COLOR;
            c.on(cc.Node.EventType.MOUSE_ENTER, onMouseEnter);
            c.on(cc.Node.EventType.MOUSE_LEAVE, onMouseLeave);
            c.on(cc.Node.EventType.TOUCH_END, (e: cc.Event.EventTouch) => {
                routeTo("/city", {
                    city: c.name,
                    left: isPanelOnLeft(() => e.getLocationX() > cc.winSize.width / 2) ? 1 : 0,
                });
            });
            const l = c.getComponentInChildren(cc.Label);
            l.string = MAP[c.name as keyof typeof MAP]?.name() ?? (CC_DEBUG ? `KEY NOT FOUND: ${l.name}` : "");
        });
    }

    protected override update() {
        this.cities.children.forEach((c) => {
            c.scale = cc.misc.clampf(1 / this.camera.zoomRatio, 1, 2);
            c.children[0].active = 1 / this.camera.zoomRatio < 2;
        });
    }
}

function onMouseEnter() {
    cc.game.canvas.style.cursor = "pointer";
}

function onMouseLeave() {
    cc.game.canvas.style.cursor = "default";
}
