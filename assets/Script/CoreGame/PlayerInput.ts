import { LINE_WIDTH } from "../General/Constants";
import { D, G, T } from "../General/GameData";
import { convertFromUIToGame, debounce, forEach } from "../General/Helper";
import { isGD, NativeSdk } from "../General/NativeSdk";
import { TypedEvent } from "../General/TypedEvent";
import { isPanelOnLeft } from "../UI/UIHelper";
import { getVirtualPointer, isMapEditMode, onResize, routeTo } from "../UI/UISystem";
import { getCurrentColor } from "./ColorThemes";
import EntityVisual from "./EntityVisual";
import { gridToString, HIGHLIGHT_EXTRA_WIDTH, stringToPosition } from "./GridHelper";
import { getAdjacentIncludeSelf, getCluster } from "./Logic/BatchMode";
import { findByType } from "./Logic/Find";
import MapInput from "./MapInput";
import { Resources } from "./ResourceDefinitions";

const { ccclass, property } = cc._decorator;

export interface SelectionChangeArgs {
    new: cc.Vec3;
    old: cc.Vec3;
}

export interface GridClickedArgs {
    grid: cc.Vec3;
    isCancel: boolean;
}

type RedrawType = "immediate" | "debounced";

@ccclass
export default class PlayerInput extends MapInput {
    @property(cc.Graphics) protected gridGraphics: cc.Graphics = null;
    @property(cc.Graphics) protected selectedGraphics: cc.Graphics = null;

    public readonly onSelectionChange = new TypedEvent<SelectionChangeArgs>();
    public readonly onGridClicked = new TypedEvent<GridClickedArgs>();

    private _selectedGrid: cc.Vec3 = null;
    private _inCutSceneMode = false;
    private _grid = G.grid;
    private _gamepadButtons: GamepadButton[];

    private _hasActiveGamepad = false;
    public get hasActiveGamepad() {
        return this._hasActiveGamepad;
    }
    public set hasActiveGamepad(value) {
        if (this._hasActiveGamepad === false && value === true) {
            const vp = getVirtualPointer();
            vp.style.display = "block";
            const rect = vp.getBoundingClientRect();
            vp.style.top = document.documentElement.clientHeight / 2 - rect.height / 2 + "px";
            vp.style.left = document.documentElement.clientWidth / 2 - rect.width / 2 + "px";
        }
        if (this._hasActiveGamepad === true && value === false) {
            getVirtualPointer().style.display = "none";
        }
        this._hasActiveGamepad = value;
    }

    public get selectedGrid(): cc.Vec3 {
        return this._selectedGrid;
    }

    private isCancel = false;

    private hijackExecutor: {
        resolve: (grid: cc.Vec3) => void;
        reject: (error: any) => void;
    };

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
        this.node.on(cc.Node.EventType.MOUSE_MOVE, this.onMouseMove, this);
        cc.game.canvas.addEventListener("mouseleave", this.onMouseLeave.bind(this));
    }

    private cameraPanDirection: cc.Vec3 = null;

    private onMouseMove(e: cc.Event.EventMouse) {
        if (!D.persisted.edgePanEnabled) {
            return;
        }
        const screenPos = e.getLocation();
        const edge = D.persisted.edgePanSize;
        const deadEdge = 1;
        const screenWidth = cc.winSize.width - convertFromUIToGame(T.modalWidth);
        const startX = T.modalPosition === "left" ? convertFromUIToGame(T.modalWidth) : 0;
        const endX = T.modalPosition === "right" ? convertFromUIToGame(T.modalWidth) : 0;
        if (
            (screenPos.x < startX + edge && screenPos.x > startX + deadEdge) ||
            (screenPos.x > cc.winSize.width - endX - edge && screenPos.x < cc.winSize.width - endX - deadEdge) ||
            (screenPos.y < edge && screenPos.y > deadEdge) ||
            (screenPos.y > cc.winSize.height - this.getHudHeight() - edge &&
                screenPos.y < cc.winSize.height - this.getHudHeight() - deadEdge)
        ) {
            const center = cc.v2(screenWidth / 2, (cc.winSize.height - this.getHudHeight()) / 2);
            this.cameraPanDirection = cc.v3(screenPos.sub(center).normalizeSelf());
        } else {
            this.cameraPanDirection = null;
        }
    }

    private onMouseLeave() {
        this.cameraPanDirection = null;
    }

    private drawGrid() {
        this.gridGraphics.clear();
        const lineWidth = LINE_WIDTH / Math.sqrt(this.cameraZoom);
        this.gridGraphics.lineWidth = lineWidth;
        this._grid.drawGrid(this.gridGraphics);
    }

    private drawSelected() {
        if (isMapEditMode()) {
            return;
        }
        this.selectedGraphics.clear();
        if (this.selectedGrid) {
            this.selectedGraphics.lineWidth = (HIGHLIGHT_EXTRA_WIDTH * LINE_WIDTH) / Math.sqrt(this.cameraZoom);
            this.selectedGraphics.strokeColor = getCurrentColor().gridSelected;
            this._grid.drawSelected(this.selectedGraphics, this.selectedGrid);
        }
    }

    public drawHighlightGrids(grids: cc.Vec3[]) {
        this.selectedGraphics.clear();
        this.selectedGraphics.lineWidth = (HIGHLIGHT_EXTRA_WIDTH * LINE_WIDTH) / Math.sqrt(this.cameraZoom);
        this.selectedGraphics.strokeColor = getCurrentColor().gridSelected;
        grids.forEach((grid) => {
            this._grid.drawSelected(this.selectedGraphics, grid);
        });
    }

    public clearSelection() {
        if (this._selectedGrid) {
            G.world.getBuildingVisual(gridToString(this._selectedGrid))?.selectOff();
        }
        this.onSelectionChange.emit({ new: null, old: this._selectedGrid });
        this._selectedGrid = null;
        forEach(G.world.getBuildingVisuals(), (k, v) => {
            v.highlightOff();
        });
        // this.pathIndicators.clear();
        G.world.resetDepositNodes();
        if (cc.isValid(this.camera)) {
            this.drawSelected();
        }
    }

    public select(grid: cc.Vec3) {
        if (this._selectedGrid) {
            G.world.getBuildingVisual(gridToString(this._selectedGrid))?.selectOff();
        }
        this.onSelectionChange.emit({ new: grid, old: this._selectedGrid });
        this._selectedGrid = grid;
        const xy = gridToString(grid);
        G.world.getBuildingVisual(xy)?.highlightOn();
        G.world.getBuildingVisual(xy)?.selectOn();
        this.highlightOnSelect(xy);
        if (cc.isValid(this.camera)) {
            this.drawSelected();
        }
    }

    public highlightOnSelect(xy: string) {
        G.world.resetDepositNodes();

        const entity = D.buildings[xy];
        const deposit = G.world.depositNodes[xy];

        let func: (v: EntityVisual) => boolean;

        if (!entity) {
            func = () => false;
        } else if (D.persisted.batchMode === "all") {
            func = (v) => v.entity.type === entity?.type;
        } else if (D.persisted.batchMode === "adjacent") {
            const adjacent = getAdjacentIncludeSelf(entity);
            func = (v) => adjacent[v.entity.grid];
        } else {
            const cluster = getCluster(entity);
            func = (v) => cluster[v.entity.grid];
        }

        G.world.highlightBuildings(func, deposit ? [deposit.name as keyof Resources] : []);
    }

    protected override minCameraPosition() {
        let xOffset = 0;
        if (this._inCutSceneMode) {
            xOffset = 0;
        } else if (D.persisted.panelPosition === "left") {
            xOffset = -convertFromUIToGame(T.modalWidth) / this.cameraZoom;
        }
        return cc.v3(cc.winSize.width / this.cameraZoom / 2 + xOffset, cc.winSize.height / this.cameraZoom / 2);
    }

    protected override maxCameraPosition() {
        let xOffset = 0;
        if (this._inCutSceneMode) {
            xOffset = 0;
        } else if (D.persisted.panelPosition === "right") {
            xOffset = convertFromUIToGame(T.modalWidth) / this.cameraZoom;
        }

        let hudHeight = 0;
        if (!this._inCutSceneMode) {
            hudHeight = this.getHudHeight() / this.cameraZoom;
        }

        const size = this._grid.getSize();
        return cc.v3(
            size.x - cc.winSize.width / this.cameraZoom / 2 + xOffset,
            hudHeight + size.y - cc.winSize.height / this.cameraZoom / 2
        );
    }

    protected override start() {
        cc.view.on("canvas-resize", this.onCanvasResize, this);
        cc.assert(!!this._grid, "Grid should be initialized before PlayerInput!");
        const size = this._grid.getSize();
        this.node.width = size.x;
        this.node.height = size.y;
        const hq = findByType("Headquarter");
        const hqPos = stringToPosition(hq.grid);
        this.onCanvasResize(hqPos);
        this.drawGrid();
    }

    protected override onCanvasResize(pos: cc.Vec3 = null) {
        // eslint-disable-next-line no-self-assign
        this.cameraZoom = this.cameraZoom;
        if (pos) {
            this.cameraPosition = pos;
        }
        onResize(cc.winSize.width, cc.winSize.height);
        this.drawGridDebounced();
        this.drawSelectedDebounced();
    }

    public goBackToHq() {
        const hq = findByType("Headquarter");
        const hqPos = stringToPosition(hq.grid);
        cc.tween<PlayerInput>(this).to(0.5, { cameraPosition: hqPos }, { easing: cc.easing.quadInOut }).start();
    }

    public hijackGridSelect(): Promise<cc.Vec3> {
        // Someone else is hijacking!
        if (this.hijackExecutor) {
            // Reject previous hijacker
            this.hijackExecutor.reject(null);
            this.hijackExecutor = null;
            // Reject this hijacker as well!
            return Promise.reject();
        }
        return new Promise<cc.Vec3>((resolve, reject) => {
            this.hijackExecutor = { resolve, reject };
        });
    }

    public clearGridSelectHijack() {
        if (this.hijackExecutor) {
            this.hijackExecutor.reject(null);
        }
        this.hijackExecutor = null;
    }

    public lookAt(position: cc.Vec3) {
        cc.tween<PlayerInput>(this)
            .to(
                0.5,
                {
                    cameraPosition: position.clone().clampf(this.minCameraPosition(), this.maxCameraPosition()),
                },
                { easing: cc.easing.quadInOut }
            )
            .start();
    }

    protected override update(dt: number): void {
        if (this._inCutSceneMode) {
            this.drawGrid();
            this.drawSelected();
        }
        const zoomBeforeUpdate = this._targetCameraZoom;
        super.update(dt);
        // Zoom Before Update is not null, but after is. This means zoom animation finishes
        // in this frame, we can finally draw grid
        if (zoomBeforeUpdate && this._targetCameraZoom === null) {
            this.drawGrid();
            this.drawSelected();
        }
        if (this.cameraPanDirection) {
            this.cameraPosition = this.cameraPosition.add(this.cameraPanDirection.mul(D.persisted.edgePanSensitivity));
        }
        this.handleGameController();
    }

    private handleGameController() {
        if (!D.persisted.gameControllerEnabled) {
            this.hasActiveGamepad = false;
            return;
        }
        const gamepads = navigator.getGamepads();
        for (let i = 0; i < gamepads.length; i++) {
            const gamepad = gamepads[i];
            if (!gamepad || gamepad.mapping !== "standard") {
                continue;
            }
            this.hasActiveGamepad = true;
            if (Math.abs(gamepad.axes[0]) > 0.01 || Math.abs(gamepad.axes[1]) > 0.01) {
                this.cameraPosition = this.cameraPosition.add(
                    cc.v3(
                        D.persisted.gameControllerCursorSensitivity * gamepad.axes[0],
                        -D.persisted.gameControllerCursorSensitivity * gamepad.axes[1]
                    )
                );
            }
            const doc = document.documentElement;
            if (Math.abs(gamepad.axes[2]) > 0.01 || Math.abs(gamepad.axes[3]) > 0.01) {
                const vp = getVirtualPointer();
                const rect = vp.getBoundingClientRect();
                const left = rect.left;
                const top = rect.top;
                vp.style.left =
                    cc.misc.clampf(
                        left + gamepad.axes[2] * D.persisted.gameControllerCursorSensitivity,
                        -rect.width / 2,
                        doc.clientWidth - vp.clientWidth / 2
                    ) + "px";
                vp.style.top =
                    cc.misc.clampf(
                        top + gamepad.axes[3] * D.persisted.gameControllerCursorSensitivity,
                        -rect.height / 2,
                        doc.clientHeight - vp.clientHeight / 2
                    ) + "px";
            }
            if (this._gamepadButtons) {
                this.handleControllerButton(gamepad);
            }
            this._gamepadButtons = gamepad.buttons.map((b) => {
                return { pressed: b.pressed, touched: b.touched, value: b.value };
            });
            // gamepad.buttons.forEach((b, index) => {
            //     if (b.pressed) {
            //         console.log(`Button [${index}] Pressed!`);
            //     }
            //     if (b.touched) {
            //         console.log(`Button [${index}] Touched!`);
            //     }
            //     if (b.value > 0) {
            //         console.log(`Button [${index}] = ${b.value}!`);
            //     }
            // });
        }
    }

    private handleControllerButton(gamepad: Gamepad) {
        const doc = document.documentElement;
        const vp = getVirtualPointer();
        const rect = vp.getBoundingClientRect();
        const screenX = rect.x + rect.width / 2;
        const screenY = rect.y + rect.height / 2;
        // Primary click
        if (
            (this._gamepadButtons[0].pressed === false && gamepad.buttons[0].pressed === true) ||
            (this._gamepadButtons[5].pressed === false && gamepad.buttons[5].pressed === true)
        ) {
            const elements = document.elementsFromPoint(screenX, screenY);
            for (let i = 0; i < elements.length; i++) {
                const element = elements[i];
                if (element !== cc.game.canvas) {
                    if (element instanceof HTMLSelectElement) {
                        element.selectedIndex = (element.selectedIndex + 1) % element.options.length;
                        element.dispatchEvent(new Event("change"));
                    } else if (element instanceof HTMLInputElement && element.type === "range") {
                        const value = parseInt(element.value, 10);
                        const max = parseInt(element.max, 10);
                        if (value >= max) {
                            element.value = element.min;
                        } else {
                            element.stepUp();
                        }
                        element.dispatchEvent(new Event("input"));
                    } else {
                        (element as HTMLElement).click();
                    }
                    return;
                }
                if (element === cc.game.canvas) {
                    break;
                }
            }
            const x = screenX * (cc.winSize.width / doc.clientWidth);
            const y = (doc.clientHeight - screenY) * (cc.winSize.height / doc.clientHeight);
            const pos = this.camera.getScreenToWorldPoint(cc.v2(x, y));
            const grid = this._grid.positionToGrid(pos);
            if (grid) {
                this.onGridSelected(
                    grid,
                    isPanelOnLeft(() => x > cc.winSize.width / 2)
                );
            }
        }
        // D-pad up
        if (this._gamepadButtons[12].pressed === false && gamepad.buttons[12].pressed === true) {
            this.onGridSelected(
                this.selectedGrid
                    .add(cc.v3(0, 1))
                    .clampf(cc.v3(0, 0), cc.v3(G.grid.getMaxTile() - 1, G.grid.getMaxTile() - 1)),
                isPanelOnLeft(() => screenX * (cc.winSize.width / doc.clientWidth) > cc.winSize.width / 2)
            );
        }
        // D-pad down
        if (this._gamepadButtons[13].pressed === false && gamepad.buttons[13].pressed === true) {
            this.onGridSelected(
                this.selectedGrid
                    .add(cc.v3(0, -1))
                    .clampf(cc.v3(0, 0), cc.v3(G.grid.getMaxTile() - 1, G.grid.getMaxTile() - 1)),
                isPanelOnLeft(() => screenX * (cc.winSize.width / doc.clientWidth) > cc.winSize.width / 2)
            );
        }
        // D-pad left
        if (this._gamepadButtons[14].pressed === false && gamepad.buttons[14].pressed === true) {
            this.onGridSelected(
                this.selectedGrid
                    .add(cc.v3(-1, 0))
                    .clampf(cc.v3(0, 0), cc.v3(G.grid.getMaxTile() - 1, G.grid.getMaxTile() - 1)),
                isPanelOnLeft(() => screenX * (cc.winSize.width / doc.clientWidth) > cc.winSize.width / 2)
            );
        }
        // D-pad right
        if (this._gamepadButtons[15].pressed === false && gamepad.buttons[15].pressed === true) {
            this.onGridSelected(
                this.selectedGrid
                    .add(cc.v3(1, 0))
                    .clampf(cc.v3(0, 0), cc.v3(G.grid.getMaxTile() - 1, G.grid.getMaxTile() - 1)),
                isPanelOnLeft(() => screenX * (cc.winSize.width / doc.clientWidth) > cc.winSize.width / 2)
            );
        }
        // Scroll up
        if (gamepad.buttons[6].value > 0) {
            const elements = document.elementsFromPoint(screenX, screenY);
            for (let i = 0; i < elements.length; i++) {
                const element = elements[i];
                if (element === cc.game.canvas) {
                    break;
                }
                (element as HTMLElement).scrollBy(
                    0,
                    -D.persisted.gameControllerScrollSensitivity * gamepad.buttons[6].value
                );
            }
            if (elements[0] === cc.game.canvas) {
                this.cameraZoom += gamepad.buttons[6].value * 0.01;
            }
        }
        // Scroll down
        if (gamepad.buttons[7].value > 0) {
            const elements = document.elementsFromPoint(screenX, screenY);
            for (let i = 0; i < elements.length; i++) {
                const element = elements[i];
                if (element === cc.game.canvas) {
                    break;
                }
                (element as HTMLElement).scrollBy(
                    0,
                    D.persisted.gameControllerScrollSensitivity * gamepad.buttons[7].value
                );
            }
            if (elements[0] === cc.game.canvas) {
                this.cameraZoom -= gamepad.buttons[7].value * 0.01;
            }
        }
    }

    protected override onMouseWheel(e: cc.Event.EventMouse) {
        if (this._inCutSceneMode) {
            return;
        }
        super.onMouseWheel(e);
    }

    public playZoomAnim(
        duration: number,
        startDelay = 0,
        finishDelay = 0,
        onStart: () => void = null,
        onFinish: () => void = null
    ): void {
        cc.tween<PlayerInput>(this)
            .call(() => {
                this._inCutSceneMode = true;
                this.cameraZoom = this.maxZoom();
                onStart?.();
            })
            .delay(startDelay)
            .to(duration, { cameraZoom: this.minZoom() }, { easing: cc.easing.quadOut })
            .delay(finishDelay)
            .call(() => {
                onFinish?.();
                this._inCutSceneMode = false;
            })
            .start();
    }

    private getHudHeight(): number {
        const top = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--sait"), 10) || 0;
        return convertFromUIToGame(30 + top);
    }

    protected override minZoom(): number {
        return Math.max(
            cc.winSize.width / this.node.width,
            (cc.winSize.height - this.getHudHeight()) / this.node.height
        );
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
        if (this._inCutSceneMode) {
            return;
        }
        super.onTouchMove(e);
        if (e.getTouches().length >= 2) {
            this.drawGridDebounced();
            this.drawSelectedDebounced();
        }
    }

    private onTouchEnd(e: cc.Event.EventTouch) {
        if (isGD()) {
            NativeSdk.showInterstitial();
        }
        const pos = this.camera.getScreenToWorldPoint(e.getLocation());
        const grid = this._grid.positionToGrid(pos);
        const isTouch = e.getLocation().sub(e.getStartLocation()).magSqr() < 10;
        if (isTouch) {
            this.onGridClicked.emit({ grid: grid, isCancel: this.isCancel });
        }
        if (isMapEditMode()) {
            return;
        }
        if (this.isCancel) {
            routeTo("/main");
            return;
        }
        if (isTouch && grid) {
            this.onGridSelected(
                grid,
                isPanelOnLeft(() => e.getLocationX() > cc.winSize.width / 2)
            );
        }
    }

    private onGridSelected(grid: cc.Vec3, left = false) {
        if (this.hijackExecutor) {
            this.hijackExecutor.resolve(grid);
            this.hijackExecutor = null;
            return;
        }
        if (this.selectedGrid?.equals(grid)) {
            return;
        }
        this.select(grid);
        const param = { xy: gridToString(grid), left: left ? 1 : 0 };
        const construction = D.buildingsToConstruct[param.xy];
        if (construction) {
            return routeTo("/construction", param);
        }
        const building = D.buildings[param.xy];
        if (!building) {
            return routeTo("/build", param);
        }
        return routeTo("/inspect", param);
    }
}
