import { LINE_WIDTH } from "../General/Constants";
import { D, T } from "../General/GameData";
import { convertFromUIToGame, debounce } from "../General/Helper";
import { isPanelOnLeft } from "../UI/UIHelper";
import { routeTo } from "../UI/UISystem";
import { getCurrentColor } from "./ColorThemes";
import { gridToString, HIGHLIGHT_EXTRA_WIDTH } from "./GridHelper";
import { HexagonGrid } from "./HexagonGrid";
import MapInput from "./MapInput";

const { ccclass, property } = cc._decorator;

@ccclass
export default class GridInput extends MapInput {
    @property(cc.Graphics) protected gridGraphics: cc.Graphics = null;
    @property(cc.Graphics) protected selectedGraphics: cc.Graphics = null;

    private _grid = new HexagonGrid(50, 32);
    private _selectedGrid: cc.Vec3 = null;
    private isCancel = false;

    private drawGridDebounced = debounce(this.drawGrid.bind(this), 250);
    private drawSelectedDebounced = debounce(this.drawSelected.bind(this), 250);

    protected override onLoad() {
        this.camera.backgroundColor = getCurrentColor().background;
        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(cc.Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        this.node.on(cc.Node.EventType.MOUSE_DOWN, this.onMouseDown, this);
        this.node.on(cc.Node.EventType.MOUSE_WHEEL, this.onMouseWheel, this);
    }

    private drawGrid() {
        this.gridGraphics.clear();
        const lineWidth = LINE_WIDTH / Math.sqrt(this.cameraZoom);
        this.gridGraphics.lineWidth = lineWidth;
        this._grid.drawGrid(this.gridGraphics);
    }

    private drawSelected() {
        this.selectedGraphics.clear();
        if (this._selectedGrid) {
            this.selectedGraphics.lineWidth = (HIGHLIGHT_EXTRA_WIDTH * LINE_WIDTH) / Math.sqrt(this.cameraZoom);
            this.selectedGraphics.strokeColor = getCurrentColor().gridSelected;
            this._grid.drawSelected(this.selectedGraphics, this._selectedGrid);
        }
    }

    protected override minCameraPosition() {
        let xOffset = 0;
        if (D.persisted.panelPosition === "left") {
            xOffset = -convertFromUIToGame(T.modalWidth) / this.cameraZoom;
        }
        return cc.v3(cc.winSize.width / this.cameraZoom / 2 + xOffset, cc.winSize.height / this.cameraZoom / 2);
    }

    protected override maxCameraPosition() {
        let xOffset = 0;
        if (D.persisted.panelPosition === "right") {
            xOffset = convertFromUIToGame(T.modalWidth) / this.cameraZoom;
        }
        const hudHeight = convertFromUIToGame(30);
        const size = this._grid.getSize();
        return cc.v3(
            size.x - cc.winSize.width / this.cameraZoom / 2 + xOffset,
            hudHeight / this.cameraZoom + size.y - cc.winSize.height / this.cameraZoom / 2
        );
    }

    protected override start() {
        cc.view.on("canvas-resize", this.onCanvasResize, this);
        const size = this._grid.getSize();
        this.node.width = size.x;
        this.node.height = size.y;
        this.onCanvasResize(cc.v3(size.x / 2, size.y / 2));
        this.drawGrid();
    }

    protected override onCanvasResize(pos: cc.Vec3 = null) {
        // eslint-disable-next-line no-self-assign
        this.cameraZoom = this.cameraZoom;
        if (pos) {
            this.cameraPosition = pos;
        }
        this.drawGridDebounced();
        this.drawSelectedDebounced();
    }

    protected override update(dt: number): void {
        const zoomBeforeUpdate = this._targetCameraZoom;
        super.update(dt);
        // Zoom Before Update is not null, but after is. This means zoom animation finishes
        // in this frame, we can finally draw grid
        if (zoomBeforeUpdate && this._targetCameraZoom === null) {
            this.drawGrid();
            this.drawSelected();
        }
    }

    protected override minZoom(): number {
        const hudHeight = convertFromUIToGame(30);
        let modalWidth = 0;
        if (D.persisted.panelPosition === "right" || D.persisted.panelPosition === "left") {
            modalWidth = convertFromUIToGame(T.modalWidth);
        }
        return Math.max(
            (cc.winSize.width - modalWidth) / this.node.width,
            (cc.winSize.height - hudHeight) / this.node.height
        );
    }

    protected override maxZoom(): number {
        return 2;
    }

    private onTouchStart(e: cc.Event.EventTouch) {
        this.isCancel = false;
    }

    private onMouseDown(e: cc.Event.EventMouse) {
        if (e.getButton() === 2) {
            this.isCancel = true;
        }
    }

    protected override onTouchMove(e: cc.Event.EventTouch) {
        super.onTouchMove(e);
        if (e.getTouches().length >= 2) {
            this.drawGridDebounced();
            this.drawSelectedDebounced();
        }
    }

    private onTouchEnd(e: cc.Event.EventTouch) {
        if (this.isCancel) {
            routeTo("/main");
            return;
        }
        if (e.getLocation().sub(e.getStartLocation()).magSqr() < 10) {
            const worldPos = this.camera.getScreenToWorldPoint(e.getLocation());
            const pos = this.node.convertToNodeSpaceAR(worldPos);
            const grid = this._grid.positionToGrid(pos);
            if (grid) {
                this.onGridSelected(
                    grid,
                    isPanelOnLeft(() => e.getLocationX() > cc.winSize.width / 2)
                );
            }
        }
    }

    private onGridSelected(grid: cc.Vec3, left = false) {
        this._selectedGrid = grid;
        this.drawSelected();
        routeTo("/conglomerate", { xy: gridToString(grid) });
    }
}
