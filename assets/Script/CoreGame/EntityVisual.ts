import { D, G, T } from "../General/GameData";
import { assert, getOrSet, getUniqueCounter, keysOf, nf } from "../General/Helper";
import { ResourceNumberMap, ResourceSet } from "./Buildings/BuildingDefinitions";
import { tickGeneral } from "./Buildings/BuildingTicks";
import { DOT_OPACITY_DEFAULT, getBuildingColor, getCurrentColor } from "./ColorThemes";
import { gridEqual, gridToPosition, stringToGrid } from "./GridHelper";
import { DefenseCommandEntity, Entity, getInput, getOutput, InputCapacityOverrideValues } from "./Logic/Entity";
import { findClosestForResource, sortByDistanceForResource } from "./Logic/Find";
import {
    addResourceTo,
    BLD,
    canBuild,
    deductFromAssertEnough,
    getActivePolicyCount,
    getFuelCostForBuilding,
    getPrestigeCurrency,
    getRecipeSpriteFrame,
    getResDiff,
    hasOutput,
    isProfitable,
    MAP,
    MOVE_SPEED,
    RES,
    tryDeductResource,
    unlockableBuildings,
} from "./Logic/Logic";
import {
    getAutoSellAmountFor,
    getFactoryMiningDeposit,
    getInputAmount,
    getOutputAmount,
    getPower,
} from "./Logic/Production";
import { isPolicyActive } from "./Logic/SelfContained";
import { Resources } from "./ResourceDefinitions";

const { ccclass, property } = cc._decorator;

@ccclass
export default class EntityVisual extends cc.Component {
    @property(cc.Node) protected ring: cc.Node = null;
    @property(cc.Node) protected warning: cc.Node = null;
    @property(cc.Node) protected turnOff: cc.Node = null;
    @property(cc.Node) protected noPower: cc.Node = null;
    @property(cc.Node) public underConstruction: cc.Node = null;
    @property(cc.Sprite) public sprite: cc.Sprite = null;
    @property(cc.Sprite) public recipeSprite: cc.Sprite = null;
    @property(cc.Sprite) public recipeSpriteBg: cc.Sprite = null;
    @property(cc.Label) protected level: cc.Label = null;

    public entity: Entity;
    public notEnoughPower = false;
    public notEnoughResources = false;
    public notEnoughFuel = false;
    public cannotFindResources = false;
    public isWorking = false;
    public fuelCost = 0;
    public notEnoughPermit = false;
    public manualSourceFallback: ResourceSet = {};
    public lastTransportTime: ResourceNumberMap = {};
    public cumulatedTicks = 0;

    protected override onEnable() {
        this.level.node.active = false;
        this.warning.active = false;
        this.turnOff.active = false;
        this.noPower.active = false;
        this.underConstruction.active = false;
        this.setColor(this.getVisualColor());
        this.ring.scaleX = MAP[D.map].south ? -1 : 1;
        this.ring.active = false;
        G.onRedraw.on(this.onUIRedraw);
    }

    protected override update(dt: number): void {
        if (!this.ring.active) {
            return;
        }
        if (this.ring.opacity <= 0) {
            return;
        }
        const size = this.ring.width;
        const rect = cc.rect(this.node.x - size / 2, this.node.y - size / 2, size, size);
        if (!G.world.isRectInView(rect)) {
            return;
        }
        this.ring.angle += 180 * this.ring.scaleX * dt;
    }

    private setColor(color: cc.Color) {
        this.sprite.node.color = color;
        this.recipeSprite.node.color = color;
        this.ring.color = color;
        this.level.node.color = color;
        this.warning.color = color;
        this.turnOff.color = color;
        this.noPower.color = color;
        this.underConstruction.color = color;
    }

    protected override onDisable() {
        G.onRedraw.off(this.onUIRedraw);
    }

    private onUIRedraw = () => {
        if (!canBuild(this.entity.type)) {
            switch (this.entity.type) {
                case "CentralBank":
                    this.setUnread(D.offlineEarnings.length);
                    return;
                case "WholesaleCenter":
                    this.setUnread(D.orders.length);
                    return;
                case "PolicyCenter":
                    this.setUnread(getActivePolicyCount(), false);
                    return;
                case "SwissShop":
                    this.setUnread(getPrestigeCurrency() > 0 ? 1 : 0);
                    return;
                case "ResearchLab":
                    this.setUnread(Object.keys(unlockableBuildings()).length, false);
                    return;
                case "TradeCenter":
                    this.setUnread(Object.keys(D.autoSellRes).length, false);
                    return;
                case "LogisticsDepartment":
                    this.warning.active = getResDiff(D.fuelResType) < 0;
                    return;
                default:
                    return;
            }
        }
        if (this.entity.construction) {
            this.sprite.node.opacity = 100;
            this.underConstruction.active = true;
            const color = getCurrentColor();
            this.underConstruction.color = this.entity.construction === "unpaid" ? color.building : color.hq;
            this.underConstruction.opacity = this.entity.construction === "unpaid" ? 100 : 255;
            return;
        }
        this.underConstruction.active = false;
        this.level.string = nf(this.entity.level);
        this.level.node.active = true;
        this.warning.active = false;
        this.turnOff.active = false;
        this.noPower.active = false;
        this.recipeSprite.spriteFrame = getRecipeSpriteFrame(this.entity);
        if (this.recipeSprite.spriteFrame) {
            this.recipeSpriteBg.node.color = getCurrentColor().background;
            this.recipeSpriteBg.node.active = true;
        } else {
            this.recipeSpriteBg.node.active = false;
        }
        if (this.notEnoughPermit) {
            this.turnOff.active = true;
        } else if (this.entity.turnOff) {
            this.turnOff.active = true;
        } else if (this.notEnoughPower) {
            this.noPower.active = true;
        } else {
            // this.warning.active = !isProfitable(this);
        }
    };

    private setUnread(n: number, toggleRing = true) {
        this.level.node.color = this.sprite.node.color;
        this.level.string = nf(n);
        this.level.node.active = n > 0;
        if (toggleRing) {
            this.ring.active = n > 0;
        }
    }

    public highlightOn() {
        this.setColor(getCurrentColor().buildingSelected);
    }

    public highlightOff() {
        this.setColor(this.getVisualColor());
    }

    public selectOn() {
        if (this.entity.type === "DefenseCommand") {
            const e = this.entity as DefenseCommandEntity;
            G.world.drawRange.clear();
            G.world.drawRange.circle(this.node.x, this.node.y, e.range);
            G.world.drawRange.fillColor = getCurrentColor().buildingSelected.clone().setA(25);
            G.world.drawRange.fill();
            G.world.drawRange.strokeColor = getCurrentColor().buildingSelected.clone().setA(50);
            G.world.drawRange.stroke();
        }
    }

    public selectOff() {
        G.world.drawRange.clear();
    }

    private getVisualColor(): cc.Color {
        const color = getCurrentColor();
        if (canBuild(this.entity.type)) {
            return cc.color().fromHEX(getBuildingColor(this.entity.type));
        }
        return color.hq;
    }

    public tick() {
        this.notEnoughPermit = false;
        if (this.entity.construction) {
            cc.warn("Should not tick this visual since it is under construction!");
            return;
        }
        if (this.skipProduction()) {
            return;
        }
        this.tickPolicy();
        this.transportResourceInput();
        this.produceOutput();
        this.updateVisual();
        this.cumulatedTicks = 0;
    }

    public outOfPermit() {
        this.notEnoughPermit = true;
        this.isWorking = false;
        this.fuelCost = 0;
        this.updateVisual();
    }

    private tickPolicy() {
        if (canBuild(this.entity.type) && isPolicyActive("CostSaver")) {
            this.entity.turnOff = !isProfitable(this);
        }
    }

    private skipProduction(): boolean {
        this.cumulatedTicks++;
        return this.cumulatedTicks < getOrSet(this.entity, "tickSec", 1);
    }

    public getPowerUsage() {
        return -getPower(this.entity) * this.cumulatedTicks;
    }

    public convertInputToOutput() {
        keysOf(getInput(this.entity)).forEach((k) => {
            deductFromAssertEnough(this.entity, k, getInputAmount(this.entity, k) * this.cumulatedTicks, true);
        });
        keysOf(getOutput(this.entity)).forEach((k) => {
            addResourceTo(this.entity, k, getOutputAmount(this.entity, k) * this.cumulatedTicks, true);
        });
    }

    public hasEnoughResources() {
        return keysOf(getInput(this.entity)).every(
            (k) => this.entity.resources[k] >= getInputAmount(this.entity, k) * this.cumulatedTicks
        );
    }

    public canBuildOnTile(): boolean {
        const cb = BLD[this.entity.type].canBuildOnTile;
        if (!cb) {
            return true;
        }
        return cb(this.entity.grid);
    }

    private produceOutput() {
        this.isWorking = false;
        this.notEnoughPower = false;
        this.notEnoughResources = false;
        const b = BLD[this.entity.type];
        if (b.tick) {
            b.tick(this);
            return;
        }
        tickGeneral(this);
    }

    private updateVisual() {
        if (canBuild(this.entity.type) || this.isTradeCenter() || hasOutput(this.entity.type)) {
            const newOpacity = !canBuild(this.entity.type) || this.isWorking ? 255 : 100;
            if (this.sprite.node.opacity !== newOpacity) {
                cc.tween(this.sprite.node).to(0.5, { opacity: newOpacity }).start();
            }
            if (this.recipeSprite.node.opacity !== newOpacity) {
                cc.tween(this.recipeSprite.node).to(0.5, { opacity: newOpacity }).start();
            }

            if (this.ring.active && !this.isWorking) {
                this.ring.opacity = 255;
                cc.tween(this.ring)
                    .to(0.5, { opacity: 0 }, { easing: cc.easing.quadOut })
                    .call(() => (this.ring.active = false))
                    .start();
            }

            if (!this.ring.active && this.isWorking) {
                this.ring.active = true;
                this.ring.opacity = 0;
                cc.tween(this.ring).to(0.5, { opacity: 255 }, { easing: cc.easing.quadIn }).start();
            }
        }
    }

    private isTradeCenter() {
        return this.entity.type === "TradeCenter";
    }

    private transportResourceInput() {
        this.notEnoughFuel = false;
        this.cannotFindResources = false;
        this.fuelCost = 0;

        if (this.entity.turnOff) {
            return;
        }

        let resourceInput: (keyof Resources)[];
        if (this.isTradeCenter()) {
            resourceInput = keysOf(D.autoSellRes);
        } else {
            resourceInput = keysOf(getInput(this.entity));
        }

        const deposit = getFactoryMiningDeposit(this.entity);
        if (deposit) {
            resourceInput = resourceInput.filter((r) => r !== deposit);
        }

        this.manualSourceFallback = {};

        resourceInput.forEach((v) => {
            if (!this.entity.resources[v]) {
                this.entity.resources[v] = 0;
            }

            let requiredAmount = getInputAmount(this.entity, v) * this.cumulatedTicks;

            if (this.isTradeCenter()) {
                this.entity.partialTransport = true;
                requiredAmount = getAutoSellAmountFor(v);
            }

            const shouldAlwaysInput = this.entity.type === "Warehouse" || this.isTradeCenter();

            if (!shouldAlwaysInput && this.entity.resources[v] > requiredAmount * this.getInputBuffer(v)) {
                return;
            }

            if (!this.isTradeCenter()) {
                requiredAmount *= InputCapacityOverrideValues[this.entity.inputCapacityOverride];
            }

            let targets = [];
            if (this.entity.inputOverride[v] && D.buildings[this.entity.inputOverride[v]]) {
                targets = [D.buildings[this.entity.inputOverride[v]]];
            }
            // Manual Source Fallback - auto
            if (this.entity.inputOverride[v] && (targets[0]?.resources?.[v] ?? 0) < requiredAmount) {
                this.manualSourceFallback[v] = true;
                if (this.entity.inputOverrideFallback === "auto") {
                    targets = [];
                } else if (this.entity.inputOverrideFallback === "drain") {
                    requiredAmount = targets[0]?.resources?.[v] ?? 0;
                } else if (this.entity.inputOverrideFallback === "skip") {
                    return;
                }
            }

            if (targets.length <= 0) {
                if (this.entity.partialTransport) {
                    targets = sortByDistanceForResource(this.entity, v);
                } else {
                    const target = findClosestForResource(this.entity, v, requiredAmount);
                    if (target) {
                        targets = [target];
                    }
                }
            }

            if (targets.length <= 0) {
                this.cannotFindResources = true;
                return;
            }

            if (requiredAmount <= 0) {
                return;
            }

            targets.some((t) => {
                const amount = Math.min(t.resources[v], requiredAmount);
                requiredAmount -= amount;
                if (amount > 0) {
                    this.transport(t, this.entity, v, amount);
                }
                return requiredAmount <= 0;
            });
        });
    }

    private getInputBuffer(v: string): number {
        let maxBufferCycle = 0;
        switch (this.entity.inputBuffer) {
            case "auto":
                maxBufferCycle = 2 + (this.lastTransportTime[v] ?? 0) / this.cumulatedTicks;
                break;
            case "stockpile":
                maxBufferCycle = Infinity;
                break;
            case "x2":
                maxBufferCycle = 2;
                break;
            case "x5":
                maxBufferCycle = 5;
                break;
            case "x10":
                maxBufferCycle = 10;
                break;
            case "x20":
                maxBufferCycle = 20;
                break;
            case "x50":
                maxBufferCycle = 50;
                break;
            case "x100":
                maxBufferCycle = 100;
                break;
            default:
                break;
        }
        return maxBufferCycle;
    }

    public transport(from: Entity, to: Entity, resource: keyof Resources, amount: number) {
        assert(
            from.resources[resource] >= amount,
            "EntityVisual.transportFrom: not enough resources, please check in the caller"
        );
        const toGrid = stringToGrid(to.grid);
        const toPosition = gridToPosition(toGrid);
        const fromGrid = stringToGrid(from.grid);
        const fromPosition = gridToPosition(fromGrid);
        const dist = fromPosition.sub(toPosition).mag();
        let speedScaler = 1;
        if (isPolicyActive("HalfTransportSpeed")) {
            speedScaler *= 0.75;
        }
        if (isPolicyActive("HighSpeedWarehouse") && (from.type === "Warehouse" || to.type === "Warehouse")) {
            speedScaler *= 1.5;
        }
        const costScaler = isPolicyActive("HalfTransportSpeed") ? 0.75 : 1;
        const speed = speedScaler * MOVE_SPEED;
        const time = dist / speed;
        this.lastTransportTime[resource] = time;
        // Transport fuel does not cost fuel
        const fuelCost =
            resource === D.fuelResType
                ? 0
                : getFuelCostForBuilding(from, to, dist * Math.sqrt(amount) * RES[resource].fuelCost * costScaler);
        if (tryDeductResource(D.fuelResType, fuelCost)) {
            T.next.fuelCost += fuelCost;
            this.fuelCost += fuelCost;
        } else {
            this.notEnoughFuel = true;
            return;
        }
        deductFromAssertEnough(from, resource, amount);
        const id = `Counter.${getUniqueCounter()}`;
        T.dots[id] = {
            fromXy: from.grid,
            toXy: to.grid,
            fromPosition,
            toPosition,
            type: resource,
            aliveUntil: Date.now() + time * 1000,
            fuelCost,
            fuelRes: D.fuelResType,
            totalTime: time,
            amount,
        };
        if (shouldShowResourceMovement(fromGrid, toGrid)) {
            const r = G.world.dotsPool.get();
            r.node.color = getCurrentColor().building;
            r.node.opacity = DOT_OPACITY_DEFAULT;
            r.node.position = fromPosition;
            T.dots[id].dot = r;
        }
    }
}

function shouldShowResourceMovement(fromGrid: cc.Vec3, toGrid: cc.Vec3): boolean {
    if (D.persisted.resourceMovement === "hide") {
        return false;
    }
    if (D.persisted.resourceMovement === "show") {
        return true;
    }
    if (D.persisted.resourceMovement === "highlight") {
        return (
            gridEqual(fromGrid, G.world.playerInput.selectedGrid) || gridEqual(toGrid, G.world.playerInput.selectedGrid)
        );
    }
    if (D.persisted.resourceMovement === "viewport") {
        return G.world.isPointInView(gridToPosition(fromGrid)) || G.world.isPointInView(gridToPosition(toGrid));
    }
    return false;
}
