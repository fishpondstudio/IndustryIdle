import { D } from "../General/GameData";
import { convertFromUIToGame } from "../General/Helper";

const { ccclass, property } = cc._decorator;

@ccclass
export default class MapInput extends cc.Component {
    @property(cc.Camera) protected camera: cc.Camera = null;

    protected _targetCameraZoom: number;
    protected _cursorPos: cc.Vec2;

    public get cameraPosition(): cc.Vec3 {
        return this.camera.node.position;
    }

    public set cameraPosition(value: cc.Vec3) {
        this.camera.node.position = value.clone().clampf(this.minCameraPosition(), this.maxCameraPosition());
    }

    public get cameraZoom(): number {
        return this.camera.zoomRatio;
    }

    public set cameraZoom(value: number) {
        this.camera.zoomRatio = cc.misc.clampf(value, this.minZoom(), this.maxZoom());
        // eslint-disable-next-line no-self-assign
        this.cameraPosition = this.cameraPosition;
    }

    protected override onLoad() {
        this.node.on(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(cc.Node.EventType.MOUSE_WHEEL, this.onMouseWheel, this);
    }

    protected override update(dt: number): void {
        if (this._targetCameraZoom) {
            const posBefore = this.camera.getScreenToWorldPoint(this._cursorPos);
            this.cameraZoom = cc.misc.lerp(this.cameraZoom, this._targetCameraZoom, Math.min(10 * dt, 1 / 3));
            const posAfter = this.camera.getScreenToWorldPoint(this._cursorPos);
            this.cameraPosition = this.cameraPosition.add(posBefore.subSelf(posAfter));
            if (Math.abs(this._targetCameraZoom - this.cameraZoom) < 1e-3) {
                this._targetCameraZoom = null;
            }
        }
    }

    protected minCameraPosition(): cc.Vec3 {
        return cc.v3(-Infinity, cc.winSize.height / this.camera.zoomRatio / 2 - 1250, 0);
    }

    protected maxCameraPosition(): cc.Vec3 {
        const ratio = cc.winSize.height / cc.view.getFrameSize().height;
        const hudHeight = 30 * ratio;
        return cc.v3(
            Infinity,
            hudHeight / this.camera.zoomRatio + 1250 - cc.winSize.height / this.camera.zoomRatio / 2
        );
    }

    protected minZoom(): number {
        const hudHeight = convertFromUIToGame(30);
        return (cc.winSize.height - hudHeight) / 2500;
    }

    protected maxZoom(): number {
        // For portrait mode, we allow max zoom of 5
        return cc.winSize.width > cc.winSize.height ? 2 : 5;
    }

    protected override start() {
        cc.view.on("canvas-resize", this.onCanvasResize, this);
        this.onCanvasResize(cc.v3(0, 0));
    }

    protected onCanvasResize(pos: cc.Vec3 = null) {
        this.cameraZoom = 0;
        if (pos) {
            this.cameraPosition = pos;
        }
    }

    protected onMouseWheel(e: cc.Event.EventMouse) {
        this._targetCameraZoom = cc.misc.clampf(
            this.cameraZoom + e.getScrollY() * 0.001 * (D.persisted.scrollSensitivity || 1),
            this.minZoom(),
            this.maxZoom()
        );
        this._cursorPos = e.getLocation();
    }

    protected onTouchMove(e: cc.Event.EventTouch) {
        const touches = e.getTouches();
        if (touches.length >= 2) {
            const touch1 = touches[0];
            const touch2 = touches[1];
            const distance = touch1.getLocation().sub(touch2.getLocation());
            const delta = touch1.getDelta().sub(touch2.getDelta());
            let scale = 1;
            if (Math.abs(distance.x) > Math.abs(distance.y)) {
                scale = ((distance.x + delta.x) / distance.x) * this.cameraZoom;
            } else {
                scale = ((distance.y + delta.y) / distance.y) * this.cameraZoom;
            }
            this.cameraZoom = scale;
        } else {
            this.cameraPosition = this.cameraPosition
                .sub(cc.v3(e.getDelta()).divSelf(this.cameraZoom))
                .clampf(this.minCameraPosition(), this.maxCameraPosition());
        }
    }
}
