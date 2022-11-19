import { D, G, T, TempData } from "../General/GameData";
import {
    assert,
    forEach,
    hasValue,
    isPointInView,
    isRectInView,
    keysOf,
    randOne,
    sizeOf,
    srand,
    uuidv4,
} from "../General/Helper";
import { OnKeydownEvent } from "../UI/Shortcut";
import { isMapEditMode, routeTo } from "../UI/UISystem";
import { Buildings, ResourceNumberMap } from "./Buildings/BuildingDefinitions";
import { safeSaveToSteamCloud } from "./CloudSave";
import { DOT_OPACITY_HIGHLIGHT, getCurrentColor } from "./ColorThemes";
import EntityVisual from "./EntityVisual";
import { gridEqual, gridToPosition, gridToString, stringToGrid, stringToPosition } from "./GridHelper";
import { ConstructionStatus, Entity, makeEntity } from "./Logic/Entity";
import { findByType } from "./Logic/Find";
import { addResourceTo, BLD, buildingCanInput, canBuild, Deposit, getBuilderMoveSpeed, isMine, MAP, RES } from "./Logic/Logic";
import { depositsToArray, IMap } from "./MapDefinitions";
import BulletsPool from "./NodePools/BulletsPool";
import DotsPool from "./NodePools/DotsPool";
import MonstersPool from "./NodePools/MonstersPool";
import PlayerInput from "./PlayerInput";
import { Resources } from "./ResourceDefinitions";
import { runEveryMinute, runEverySecond } from "./RunEvery";
import ICanAttack from "./TowerDefense/ICanAttack";
import { WaveManager } from "./TowerDefense/WaveManager";

const { ccclass, property } = cc._decorator;

const fastIsEmptyObject = (obj: any) => !obj;

@ccclass
export default class World extends cc.Component {
    @property(cc.Prefab) protected readonly building: cc.Prefab = null;
    @property(cc.SpriteFrame) protected readonly underConstruction: cc.SpriteFrame = null;
    @property(PlayerInput) public readonly playerInput: PlayerInput = null;
    @property(cc.Camera) protected readonly camera: cc.Camera = null;
    @property(cc.Node) protected readonly overlayTexts: cc.Node = null;
    @property(cc.BitmapFont) protected readonly font: cc.BitmapFont = null;
    @property(DotsPool) public readonly dotsPool: DotsPool = null;
    @property(cc.Graphics) public readonly pathIndicators: cc.Graphics = null;
    @property(MonstersPool) public readonly monstersPool: MonstersPool = null;
    @property(BulletsPool) public readonly bulletsPool: BulletsPool = null;
    @property(cc.Graphics) public readonly drawRange: cc.Graphics = null;
    @property(cc.Sprite) public readonly mapOverlay: cc.Sprite = null;

    public readonly buildingVisuals: Record<string, EntityVisual> = {};
    public readonly depositNodes: Record<string, cc.Node> = {};
    public waveManager: WaveManager;
    protected readonly overlayLabels: Record<string, cc.Label> = {};

    private activeBuilderCount = 0;
    private overlayTextQueue: (() => void)[] = [];
    private hasOverlay = false;

    protected override onLoad() {
        this.waveManager = new WaveManager(this.monstersPool, this.pathIndicators, this.playerInput.onSelectionChange);
        G.world = this;
    }

    protected override start() {
        this.createMap();

        forEach(D.buildings, (xy, entity) => {
            assert(xy === entity.grid, "Assert entity.key === entity.grid");
            if (!this.placeBuilding(entity)) {
                delete D.buildings[xy];
            }
        });

        forEach(D.buildingsToConstruct, (xy, entity) => {
            assert(xy === entity.grid, "Assert entity.key === entity.grid");
            if (entity.construction === "building") {
                entity.construction = "queueing";
            }
            if (!this.placeBuilding(entity)) {
                delete D.buildingsToConstruct[xy];
            }
        });

        this.dotsPool.init(D.persisted.resourceMovement === "show" ? sizeOf(D.buildings) : 10);

        if (this.waveManager.wormholes.length > 0) {
            this.monstersPool.init(10);
            this.bulletsPool.init(50);
        }

        this.waveManager.redrawWormholePath();

        Object.assign(T, new TempData());

        runEverySecond();
        this.schedule(runEverySecond, 1, cc.macro.REPEAT_FOREVER, 0);

        runEveryMinute();
        this.schedule(runEveryMinute, 60, cc.macro.REPEAT_FOREVER, 0);

        this.scheduleOnce(() => safeSaveToSteamCloud(), 10);
        this.schedule(safeSaveToSteamCloud, 60 * 10, cc.macro.REPEAT_FOREVER, 0);

        if (isMapEditMode() && this.mapOverlay) {
            this.enableMapEditMode();
        }
    }

    private enableMapEditMode() {
        const storage = cc.sys.localStorage as Storage;
        const storageKey = "MapEditor";
        const data = storage.getItem(storageKey);
        const map = { tiles: {}, x: 0, y: 0 };
        if (data) {
            Object.assign(map, JSON.parse(data));
        } else {
            const size = G.grid.getSize();
            map.x = size.x / 2;
            map.y = size.y / 2;
        }
        this.mapOverlay.node.setPosition(map.x, map.y);
        this.playerInput.drawHighlightGrids(keysOf(map.tiles).map((xy) => stringToGrid(xy)));
        const saveMapData = () => {
            const data = JSON.stringify(map);
            cc.log("Map Editor Data:", data);
            storage.setItem(storageKey, data);
        };
        OnKeydownEvent.on((e) => {
            switch (e.key) {
                case "w":
                    this.mapOverlay.node.y += 1;
                    break;
                case "s":
                    this.mapOverlay.node.y -= 1;
                    break;
                case "d":
                    this.mapOverlay.node.x += 1;
                    break;
                case "a":
                    this.mapOverlay.node.x -= 1;
                    break;
                case "h":
                    this.mapOverlay.node.active = !this.mapOverlay.node.active;
                    break;
                default:
                    break;
            }
            map.x = this.mapOverlay.node.x;
            map.y = this.mapOverlay.node.y;
            saveMapData();
        });
        this.playerInput.onGridClicked.on((e) => {
            const xy = gridToString(e.grid);
            if (e.isCancel) {
                delete map.tiles[xy];
            } else {
                map.tiles[xy] = true;
            }
            this.playerInput.drawHighlightGrids(keysOf(map.tiles).map((xy) => stringToGrid(xy)));
            saveMapData();
        });
    }

    public forEachOverlay(func: (xy: string, label: cc.Label) => void): void {
        this.overlayTextQueue = [];
        this.hasOverlay = true;
        forEach(this.overlayLabels, (xy, label) => {
            this.updateDepositVisual(xy);
            if (!this.buildingVisuals[xy]) {
                if (isPointInView(stringToPosition(xy), this.camera)) {
                    this.overlayTextQueue.unshift(func.bind(this, xy, label));
                }
                this.overlayTextQueue.push(func.bind(this, xy, label));
            }
        });
    }

    public isPointInView(pos: cc.Vec3): boolean {
        return isPointInView(pos, this.camera);
    }

    public isRectInView(rect: cc.Rect): boolean {
        return isRectInView(rect, this.camera);
    }

    public clearOverlay(): void {
        this.overlayTextQueue = [];
        if (!this.hasOverlay) {
            return;
        }
        this.hasOverlay = false;
        forEach(this.overlayLabels, (xy, label) => {
            this.updateDepositVisual(xy);
            label.node.active = false;
        });
    }

    public clearSelection(): void {
        this.playerInput?.clearSelection();
    }

    public routeTo(xy: string): void {
        routeTo("/inspect", { xy });
    }

    public goBackToHq(): void {
        this.playerInput.goBackToHq();
    }

    protected override update(dt: number) {
        this.tickEntityVisual(dt);
        this.tickDots();
        this.tickOverlayText();
        this.waveManager.tick(dt);
    }

    private tickOverlayText() {
        const count = Math.min(100, this.overlayTextQueue.length);
        if (count > 0) {
            // Patch cc.js.isEmptyObject
            const _originalIsEmpty = cc.js.isEmptyObject;
            cc.js.isEmptyObject = fastIsEmptyObject;
            for (let i = 0; i < count; i++) {
                this.overlayTextQueue.shift()();
            }
            cc.js.isEmptyObject = _originalIsEmpty;
            // Restore cc.js.isEmptyObject
        }
    }

    private tickDots() {
        const now = Date.now();
        forEach(T.dots, (k, v) => {
            if (v.aliveUntil <= now) {
                const target = D.buildings[v.toXy];
                if (target) {
                    addResourceTo(target, v.type, v.amount);
                    if (v.fuelRes === "Bat") {
                        addResourceTo(target, "BatSl", v.fuelCost, true);
                    }
                }
                if (v.dot) {
                    this.dotsPool.put(v.dot);
                }
                delete T.dots[k];
            } else if (v.dot) {
                const ratio = 1 - (v.aliveUntil - now) / (1000 * v.totalTime);
                const pos = v.fromPosition.lerp(v.toPosition, cc.easing.quadInOut(ratio));
                if (this.isPointInView(pos) || this.isPointInView(v.dot.node.position)) {
                    v.dot.node.position = pos;
                }
            }
        });
    }

    private tickEntityVisual(dt: number) {
        const max = Math.min(Math.ceil(T.tickQueueLength * dt), T.tickQueue.length);
        for (let i = 0; i < max; i++) {
            const xy = T.tickQueue.shift();
            this.buildingVisuals[xy]?.tick();
        }
    }

    private createMap() {
        let isNewMap = false;

        if (!D.seed) {
            isNewMap = true;
            D.seed = uuidv4();
        }

        const map = MAP[D.map];
        this.generateMap(map, D.seed);

        if (isNewMap) {
            setFuelForMap(map);
            map.setup();
        }
    }

    private generateMap(map: IMap, seed: string) {
        const rand = srand(seed);
        const deposits = depositsToArray(map.deposits);
        // const stat: Partial<Record<Deposit, number>> = {};
        const noise = map.tileNoise?.(seed) ?? {};
        G.grid.forEach((k, pos) => {
            const label = new cc.Node().addComponent(cc.Label);
            label.font = this.font;
            label.verticalAlign = cc.Label.VerticalAlign.CENTER;
            label.lineHeight = 30;
            label.fontSize = 20;
            label.node.parent = this.overlayTexts;
            label.node.position = pos;
            label.node.active = false;
            this.overlayLabels[k] = label;
            if (map.resourceTiles) {
                if (!map.resourceTiles[k]) {
                    return;
                }
            } else {
                if (rand() > map.resourceProbability) {
                    return;
                }
            }
            const b = D.buildings[k];
            if (b && !canBuild(b.type)) {
                return;
            }
            const deposit = randOne(deposits, () => noise[k] ?? rand());
            // if (!stat[deposit]) {
            //     stat[deposit] = 0;
            // }
            // stat[deposit]++;
            this.makeDeposit(k, deposit);
        });
    }

    public makeDeposit(xy: string, deposit: Deposit): cc.Node {
        const node = new cc.Node(deposit);
        const sprite = node.addComponent(cc.Sprite);
        sprite.spriteFrame = RES[deposit].spriteFrame;
        sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        sprite.trim = false;
        this.depositNodes[xy] = node;
        this.updateDepositVisual(xy);
        node.color = getCurrentColor().building;
        node.parent = this.node;
        return node;
    }

    public highlightBuildings(func: (v: EntityVisual) => boolean, depositsToHighlight?: (keyof Resources)[]): number {
        let count = 0;
        let deposits: ResourceNumberMap = {};
        forEach(this.buildingVisuals, (k, v) => {
            if (func(v)) {
                v.highlightOn();
                count++;
            } else if (gridEqual(v.entity.grid, this.playerInput.selectedGrid)) {
                v.highlightOn();
            } else {
                v.highlightOff();
            }
        });
        if (depositsToHighlight) {
            deposits = {};
            depositsToHighlight.forEach((d) => (deposits[d] = 1));
        }
        forEach(this.depositNodes, (xy, node) => {
            node.color = hasValue(deposits[node.name])
                ? getCurrentColor().buildingSelected
                : getCurrentColor().building;
        });
        return count;
    }

    public locate(grid: cc.Vec3, select = false) {
        this.playerInput.lookAt(gridToPosition(grid));
        if (select) {
            this.playerInput.select(grid);
        } else {
            this.highlightBuildings((v) => gridEqual(v.entity.grid, grid));
        }
    }

    public constructBuilding(xy: string) {
        if (this.activeBuilderCount >= D.persisted.maxBuilders) {
            return;
        }
        const visual = this.buildingVisuals[xy];
        if (!visual) {
            cc.error("Building.constructBuilding: visual not found");
            return;
        }
        visual.entity.construction = "building";
        this.activeBuilderCount++;
        const hq = findByType("Headquarter");
        const hqPos = gridToPosition(stringToGrid(hq.grid));
        const dist = hqPos.sub(stringToPosition(visual.entity.grid)).mag();

        const r = this.dotsPool.get();
        r.node.color = getCurrentColor().hq;
        r.node.opacity = DOT_OPACITY_HIGHLIGHT;
        r.node.position = hqPos;

        cc.tween(r.node)
            .to(
                dist / getBuilderMoveSpeed(),
                { position: stringToPosition(visual.entity.grid) },
                { easing: cc.easing.quadInOut }
            )
            .call(() =>
                cc
                    .tween(visual.underConstruction)
                    .by(4, { angle: -4 * 180 })
                    .start()
            )
            .delay(4)
            .call(() => {
                visual.underConstruction.angle = 0;
                delete visual.entity.construction;
                delete D.buildingsToConstruct[visual.entity.grid];
                D.buildings[visual.entity.grid] = visual.entity;
                m.redraw();

                if (gridEqual(this.playerInput.selectedGrid, visual.entity.grid)) {
                    visual.highlightOn();
                }
            })
            .to(dist / getBuilderMoveSpeed(), { position: r.node.position }, { easing: cc.easing.quadInOut })
            .call(() => {
                this.dotsPool.put(r);
                this.activeBuilderCount--;
            })
            .start();
    }

    public addBuilding(xy: string, building: keyof Buildings, status: ConstructionStatus): void {
        if (D.buildingsToConstruct[xy] || D.buildings[xy]) {
            cc.error(`Trying to construct on (${xy}) but a building already exists!`);
            return;
        }
        const entity = makeEntity(xy, building);
        Object.assign(entity, D.entityDefault);
        if (!buildingCanInput(entity) && BLD[entity.type].power >= 0) {
            entity.turnOff = false;
        }
        entity.construction = status;
        D.buildingsToConstruct[xy] = entity;
        this.placeBuilding(entity);
    }

    private placeBuilding(entity: Entity): boolean {
        const position = gridToPosition(stringToGrid(entity.grid));

        if (!position) {
            return false;
        }

        const n = cc.instantiate(this.building);

        const ev = n.getComponent(EntityVisual);
        ev.sprite.spriteFrame = BLD[entity.type].spriteFrame;
        ev.entity = entity;

        if (entity.type === "Wormhole") {
            this.waveManager.wormholes.push(entity);
        }

        if (BLD[entity.type].canAttack) {
            const c = n.addComponent(ICanAttack);
            c.init(ev);
        }
        n.position = position;
        n.parent = this.node;
        this.buildingVisuals[entity.grid] = ev;
        this.updateDepositVisual(entity.grid);

        return true;
    }

    public moveBuilding(fromXy: string, toXy: string): boolean {
        // Can only move DefenseCommand
        if (D.buildings[fromXy]?.type !== "DefenseCommand") {
            return false;
        }
        // Target not empty
        if (D.buildings[toXy] || D.buildingsToConstruct[toXy]) {
            return false;
        }
        // Move entity
        D.buildings[toXy] = D.buildings[fromXy];
        D.buildings[toXy].grid = toXy;
        delete D.buildings[fromXy];
        // Move visual
        this.buildingVisuals[toXy] = this.buildingVisuals[fromXy];
        this.buildingVisuals[toXy].node.position = stringToPosition(toXy);
        delete this.buildingVisuals[fromXy];
        this.updateDepositVisual(toXy);
        return true;
    }

    private updateDepositVisual(xy: string) {
        const deposit = this.depositNodes[xy];
        if (!deposit) {
            return;
        }
        const placeCenter = () => {
            deposit.position = position;
            deposit.width = 24;
            deposit.height = 24;
        };
        const placeAside = () => {
            deposit.position = position.add(cc.v3(-16, -16));
            deposit.width = 12;
            deposit.height = 12;
        };
        const bv = this.buildingVisuals[xy];
        const position = stringToPosition(xy);

        deposit.active = true;
        if (!bv) {
            this.hasOverlay ? placeAside() : placeCenter();
            return;
        }
        const b = BLD[bv.entity.type];
        if ((isMine(bv.entity.type) && b.staticOutput[deposit.name]) || b.canBuildOnTile?.(xy)) {
            deposit.active = false;
            return;
        }
        placeAside();
    }

    public getBuildingVisual(xy: string): EntityVisual {
        return this.buildingVisuals[xy];
    }

    public getBuildingVisuals() {
        return this.buildingVisuals;
    }

    public resetDepositNodes() {
        const color = getCurrentColor().building;
        forEach(this.depositNodes, (xy, node) => {
            node.color = color;
        });
    }

    public removeBuilding(grid: cc.Vec3): Entity {
        const xy = gridToString(grid);
        // Delete visual
        const visual = this.buildingVisuals[xy];
        if (visual) {
            BLD[visual.entity.type].beforeRemove?.(visual);
            visual.selectOff();
            visual.highlightOff();
            visual.node.destroy();
            delete this.buildingVisuals[xy];
        }
        // Show the underlying deposit if any
        this.updateDepositVisual(xy);
        if (D.buildings[xy]) {
            const b = D.buildings[xy];
            delete D.buildings[xy];
            this.waveManager.redrawWormholePath();
            return b;
        } else if (D.buildingsToConstruct[xy]) {
            const b = D.buildingsToConstruct[xy];
            delete D.buildingsToConstruct[xy];
            return b;
        } else {
            return null;
        }
    }
}
function setFuelForMap(map: IMap) {
    if (map.deposits.Gas) {
        D.fuelResType = "Gas";
    } else if (map.deposits.Oil) {
        D.fuelResType = "Petrol";
    } else {
        D.fuelResType = "Bat";
    }
    G.tradeCenter.resources[D.fuelResType] = D.isFirstSession ? 1e6 : 1e5;
}
