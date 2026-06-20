import {
    D,
    G,
    GameData,
    hasDLC,
    ORIGINAL_GAMEDATA,
    PersistedData,
    saveDataOverride,
    SwissBoosts,
    T,
} from "../../General/GameData";
import {
    assert,
    DAY,
    firstKeyOf,
    forEach,
    getOrSet,
    hasProperty,
    hasValue,
    keysOf,
    MINUTE,
    permute,
    safeAdd,
    safeGet,
    sizeOf,
} from "../../General/Helper";
import { t } from "../../General/i18n";
import { serverNow } from "../../General/ServerClock";
import { FIRST_NAMES, LAST_NAMES } from "../../UI/Lib/names";
import { hideAlert, showAlert } from "../../UI/UISystem";
import { Buildings, BuildingSet, ResourceNumberMap, ResourceSet } from "../Buildings/BuildingDefinitions";
import { tickMine } from "../Buildings/BuildingTicks";
import EntityVisual from "../EntityVisual";
import { gridEqual } from "../GridHelper";
import { Maps } from "../MapDefinitions";
import { Policy } from "../PolicyDefinitions";
import { Resources } from "../ResourceDefinitions";
import { calculateBaseModuleCost, getTotalDefenseCost } from "../TowerDefense/DefenseModules";
import { DefenseCommandEntity, Entity, getInput, getOutput, MultipleRecipeEntity, WarehouseEntity } from "./Entity";
import { hasActiveTrades } from "./PlayerTrade";
import { cashForBuyOrSell, getPrice } from "./Price";
import { getInputAmount, getOutputAmount, PRODUCTION_SCALER } from "./Production";
import { isPolicyActive } from "./SelfContained";

export interface Item {
    spriteFrame?: cc.SpriteFrame;
    name: () => string;
}

export const BLD = new Buildings();
export const RES = new Resources();
export const ORIGINAL_BLD = Object.freeze(new Buildings());
export const ORIGINAL_RES = Object.freeze(new Resources());
export const POLICY = new Policy();
export const MAP = new Maps();
export const DEP = {
    Fe: true,
    Wood: true,
    Coal: true,
    Al: true,
    Si: true,
    Cu: true,
    Oil: true,
    Cr: true,
    Ti: true,
    U: true,
    Gas: true,
    Li: true,
    GV: true,
    Water: true,
} as const;
export const COMMON_DEP = {
    Fe: true,
    Wood: true,
    Coal: true,
    Al: true,
    Si: true,
} as const;
export type Deposit = keyof typeof DEP;

export const CROP = {
    Rice: true,
    Corn: true,
    Wheat: true,
    Soy: true,
    Sgcn: true,
    Vege: true,
    Coffe: true,
    Cocoa: true,
    Pmpk: true,
} as const;

export type Crop = keyof typeof CROP;

export function getFuelTypes(): (keyof Resources)[] {
    const fuel: (keyof Resources)[] = ["Petrol", "Gas", "Bat"];
    if (D.map === "Vancouver") {
        fuel.push("MpSy");
    }
    if (D.map === "RioDeJaneiro") {
        fuel.push("Biofl");
    }
    if (isHalloween()) {
        fuel.push("Pmpk");
    }
    if (isChristmas()) {
        fuel.push("Rndr");
    }
    if (isLunarNewYear()) {
        fuel.push("Ltrn");
    }
    return fuel;
}

export interface IPolicyInfo {
    active: boolean;
}

export function canBuild(b: keyof Buildings) {
    return !BLD[b].builtin;
}

export const NoPrice: ResourceSet = {
    Cash: true,
    RP: true,
    PP: true,
    Sci: true,
    Cul: true,
    Rndr: true,
    Ltrn: true,
    BatSl: true,
    GV: true,
    //Biofl: true,
    Dmg: true,
};

export const Weapon: ResourceSet = {
    Dynm: true,
    Abom: true,
    AirFc: true,
    Btshp: true,
    ICBM: true,
    Navy: true,
    Gun: true,
    Tank: true,
    Mis: true,
    Roc: true,
    Sub: true,
    Art: true,
    Crr: true,
    Nmis: true,
    StFgt: true,
    Army: true,
    SpFc: true,
};

export const FoodThatNeedsProcessing: ResourceSet = {
    Vege: true,
    Milk: true,
    Fish: true,
    Cocoa: true,
    Pork: true,
    Chkn: true,
    Beef: true,
} as const;

export const NoLocalTrade: ResourceSet = {
    ...NoPrice,
    ...CROP,
    ...FoodThatNeedsProcessing,
    Cap: true,
    Biofl: true,
} as const;

export const NoPlayerTrade: ResourceSet = {
    ...NoPrice,
    ...FoodThatNeedsProcessing,
} as const;

export const NoTransport: ResourceSet = {
    GV: true,
    Cash: true,
    Dmg: true,
};

export const NoStat: ResourceSet = {
    Cash: true,
    RP: true,
    PP: true,
    GV: true,
};

export const NoEfficiency: BuildingSet = {
    FoodProcessingPlant: true,
    FaceAppInc: true,
};

export function canPrice(b: keyof Resources) {
    return !NoPrice[b];
}

export function canTransport(b: keyof Resources) {
    return !NoTransport[b];
}

export function canTradeLocally(b: keyof Resources) {
    return !NoLocalTrade[b];
}

export function canTradeWithPlayers(b: keyof Resources) {
    return !NoPlayerTrade[b];
}

export function canShowStat(b: keyof Resources) {
    return !NoStat[b];
}

export function isOctober(): boolean {
    const time = new Date(serverNow());
    if (time.getMonth() === 9) {
        return true;
    }
    return false;
}

export function isHalloween(): boolean {
    const time = new Date(serverNow());
    if (time.getMonth() === 9 && time.getDate() >= 15) {
        return true;
    }
    if (time.getMonth() === 10 && time.getDate() <= 5) {
        return true;
    }
    return false;
}

export function isChristmas(): boolean {
    const time = new Date(serverNow());
    if (time.getMonth() === 11 && time.getDate() >= 5) {
        return true;
    }
    if (time.getMonth() === 0 && time.getDate() <= 5) {
        return true;
    }
    return false;
}

export function isLunarNewYear(): boolean {
    const time = new Date(serverNow());
    if (time.getMonth() === 0 && time.getDate() >= 25) {
        return true;
    }
    if (time.getMonth() === 1 && time.getDate() <= 10) {
        return true;
    }

    return false;
}

export function requireDeposit(r: Deposit, xy: string) {
    const deposit = G.world.depositNodes[xy]?.name as keyof Resources;
    return r === deposit;
}

export function canPlaceOnTile(b: keyof Buildings, xy: string) {
    const bld = BLD[b];
    if (!canBuild(b)) {
        return false;
    }
    if (hasValue(bld.canBuildOnTile)) {
        return bld.canBuildOnTile(xy);
    }
    return true;
}

export function warnBeforeBuild(b: keyof Buildings, xy: string, buildAction: () => void) {
    const warning = BLD[b]?.buildOnTileWarning?.(xy);
    if (warning) {
        showAlert(t("BuildWarningTitle"), t("BuildWarningTitleDesc", { reason: warning }), [
            { name: t("Cancel"), class: "outline" },
            {
                name: t("BuildWarningBuildAnyway"),
                action: () => {
                    hideAlert();
                    buildAction();
                },
                class: "outline",
            },
        ]);
    } else {
        buildAction();
    }
}

export function getAvailableCrops(): Partial<Record<Crop, true>> {
    if (D.swissBoosts.produceAllCrops) {
        return CROP;
    }
    return MAP[D.map].crops;
}

export function getRecipeSpriteFrame(entity: Entity): cc.SpriteFrame {
    if (hasProperty(entity, "recipe")) {
        const r = entity as MultipleRecipeEntity;
        if (r.recipe == entity.type) {
            return null;
        }
        if (BLD[r.recipe].spriteFrame) {
            return BLD[r.recipe].spriteFrame;
        }
    }
    return null;
}

export function averageDepositPrice() {
    return keysOf(DEP).reduce((prev, curr) => prev + D.price[curr].price, 0) / sizeOf(DEP);
}

export function isMine(b: keyof Buildings) {
    return BLD[b]?.tick === tickMine;
}

export function buildingOnlyInputDeposits(b: keyof Buildings) {
    let result = true;
    forEach(BLD[b].staticInput, (k) => {
        if (!DEP[k]) {
            result = false;
            return true;
        }
        return false;
    });
    return result;
}

export function hasOutput(b: keyof Buildings): boolean {
    return Object.keys(BLD[b].staticOutput).length > 0;
}

export function hasInput(b: keyof Buildings): boolean {
    return Object.keys(BLD[b].staticInput).length > 0;
}

export function isMineCorrectlyPlaced(entity: Entity): boolean {
    // Non-resource buildings are always valid
    if (!isMine(entity.type)) {
        return true;
    }
    const deposit = G.world.depositNodes[entity.grid];
    const b = BLD[entity.type];
    if (!deposit || !getOutput(entity)[deposit.name]) {
        return false;
    }
    return true;
}

export function getAvailableResourcesForWarehouse(entity: Entity): Partial<Record<keyof Resources, boolean>> {
    const result: Partial<Record<keyof Resources, boolean>> = {};
    forEach(getOutput(entity), (k, v) => {
        if (canPrice(k)) {
            result[k] = true;
        }
    });
    if (Object.keys(result).length > 0) {
        return result;
    }
    forEach(entity.resources, (k, v) => {
        if (canPrice(k)) {
            result[k] = true;
        }
    });
    return result;
}

export function validateWarehouse(entity: WarehouseEntity) {
    if (!entity.source) {
        entity.source = {};
    }
    if (!entity.target) {
        entity.source = {};
    }
    forEach(entity.source, (k, v) => {
        if (
            !RES[v.res] ||
            !canPrice(v.res) ||
            !D.buildings[v.xy] ||
            Object.keys(getAvailableResourcesForWarehouse(D.buildings[v.xy])).length <= 0
        ) {
            delete entity.source[k];
        }
    });
    return entity;
}

export function getFuelCostPerResource(entity: Entity) {
    const result: ResourceNumberMap = {};
    Object.keys(T.dots).forEach((r) => {
        if (gridEqual(T.dots[r].toXy, entity.grid)) {
            const n = T.dots[r];
            if (!result[n.type]) {
                result[n.type] = 0;
            }
            result[n.type] += n.fuelCost;
        }
    });
    return result;
}

export function buildingCanInput(e: Entity): boolean {
    if (e.type === "TradeCenter") {
        return true;
    }
    return Object.keys(getInput(e)).length > 0;
}

export function buildingCanOutput(e: Entity): boolean {
    return Object.keys(BLD[e.type].staticOutput).length > 0;
}

export function levelToNextMultiplier(entity: Entity) {
    const l = Math.ceil(entity.level / 10) * 10 - entity.level;
    return l > 0 ? l : 10;
}

export function getUpgradeCost(
    currentLevel: number,
    numberOfLevels: number,
    upgradeCostFunction: (level: number) => number
): number {
    let cost = 0;
    for (let i = 1; i <= numberOfLevels; i++) {
        cost += upgradeCostFunction(currentLevel + i);
    }
    return cost;
}

export function getDowngradeCost(
    currentLevel: number,
    numberOfLevels: number,
    downgradeCostFunction: (level: number) => number
): number {
    let cost = 0;
    for (let i = 0; i < numberOfLevels; i++) {
        cost += downgradeCostFunction(currentLevel - i);
    }
    return cost;
}

export function getBuildingPermitCost(permit: number) {
    return getUpgradeCost(D.buildingPermit, permit, upgradeBuildingPermitCost);
}

export const BUILDING_BASE_COST = 1000;
export const DEFENSE_MODULE_BASE_COST = 100;

export function getCostForBuilding(bld: keyof Buildings, level: number) {
    const building = ORIGINAL_BLD[bld];
    let baseCost = 0;
    forEach(building.staticInput, (k, v) => {
        baseCost += v * (D.price[k].price || averageDepositPrice()) * BUILDING_BASE_COST;
    });
    if (baseCost === 0) {
        forEach(building.staticOutput, (k, v) => {
            baseCost += v * (averageDepositPrice() || D.price[k].price) * BUILDING_BASE_COST;
        });
    }
    if (baseCost === 0) {
        baseCost += averageDepositPrice() * BUILDING_BASE_COST;
    }
    baseCost *= building.cost || 1;
    if (bld === "DefenseCommand") {
        baseCost += calculateBaseModuleCost(0);
    }
    const multiplier = canBuild(bld) ? 1.5 : 1.75;
    const cost = baseCost * Math.pow(multiplier, level);
    if (level <= 1) {
        return cost;
    }
    return cost / buildingUpgradeCostDivider();
}

function buildingUpgradeCostDivider(): number {
    return 1 + D.persisted.buildingUpgradeCostDivider - 1 + D.swissBoosts.buildingUpgradeCostDivider - 1;
}

export function buildingValue(entity: Entity) {
    let cost = 0;
    for (let i = 1; i <= entity.level; i++) {
        cost += getCostForBuilding(entity.type, i);
    }
    if (entity.type === "DefenseCommand") {
        cost += getTotalDefenseCost(entity as DefenseCommandEntity);
    }
    return cost;
}

export function refundForSellingBuilding(entity: Entity, refundAmount: number, discount: number) {
    const tc = G.tradeCenter;
    refundCash(refundAmount);
    keysOf(entity.resources).forEach((k) => {
        if (!tc.resources[k]) {
            tc.resources[k] = 0;
        }
        tc.resources[k] += discount * entity.resources[k];
    });
}

export function refundCash(amount: number): number {
    const tc = G.tradeCenter;
    assert(amount >= 0, "refundCash: amount should >= 0");
    if (D.cashSpent > amount) {
        D.cashSpent -= amount;
        tc.resources.Cash += amount;
        return amount;
    }
    const result = D.cashSpent;
    tc.resources.Cash += result;
    D.cashSpent = 0;
    return result;
}

export function getCash(): number {
    return getOrSet(G.tradeCenter.resources, "Cash", 0);
}

export function trySpendCash(amount: number): boolean {
    assert(amount > 0, "trySpendCash: amount should be positive");
    const tc = G.tradeCenter;
    if (!isFinite(tc.resources.Cash)) {
        return false;
    }
    if (tc.resources.Cash >= amount) {
        tc.resources.Cash -= amount;
        D.cashSpent = cc.misc.clampf(D.cashSpent + amount, 0, Infinity);
        return true;
    }
    return false;
}

export function addCash(amount: number): void {
    const tc = G.tradeCenter;
    tc.resources.Cash += amount;
}

export function tryDeductCash(amount: number): boolean {
    const tc = G.tradeCenter;
    if (tc.resources.Cash >= amount) {
        tc.resources.Cash -= amount;
        return true;
    }
    return false;
}

export function hasEnoughCash(amount: number): boolean {
    const tc = G.tradeCenter;
    return tc.resources.Cash >= amount;
}

export function addResourceTo(entity: Entity, res: keyof Resources, value: number, writeToIO = false) {
    if (!entity) {
        return;
    }
    if (!entity.resources[res]) {
        entity.resources[res] = value;
    } else {
        entity.resources[res] += value;
    }
    if (writeToIO) {
        T.next.io[res][1] += value;
        safeAdd(D.producedRes, res, value);
    }
}

export function getResourcesForCash(cash: number): { amountLeft: number; resources: ResourceNumberMap } {
    let amountLeft = cash;
    const result: ResourceNumberMap = {};
    const resource = keysOf(T.usableRes)
        .map((f) => {
            return { resource: f, amount: T.usableRes[f] };
        })
        .sort((a, b) => D.price[b.resource].price - D.price[a.resource].price);
    for (let i = 0; i < resource.length; i++) {
        const r = resource[i];
        if (r.amount <= 0 || !canPrice(r.resource)) {
            continue;
        }
        const price = D.price[r.resource].price;
        const value = r.amount * price;
        if (value >= Math.ceil(amountLeft / price) * price) {
            result[r.resource] = Math.ceil(amountLeft / price);
            return { amountLeft: 0, resources: result };
        } else {
            amountLeft -= r.amount * price;
            result[r.resource] = r.amount;
        }
    }
    return { amountLeft: amountLeft, resources: result };
}

export function deductFromAssertEnough(entity: Entity, res: keyof Resources, value: number, writeToIO = false): void {
    if (value <= 0) {
        cc.error(`You try to deduct 0 ${res} from ${entity.type}(${entity.grid})`);
        return;
    }
    if (!entity || !entity.resources[res] || entity.resources[res] < value) {
        cc.error(`${entity.type} (${entity.grid}) does not have required ${value} ${res}`);
        return;
    }
    entity.resources[res] -= value;
    if (writeToIO) {
        T.next.io[res][0] += value;
    }
}

export function isAvailable(f: { available?: () => boolean }): boolean {
    if (!f.available) {
        return true;
    }
    return f.available();
}

export function stableInputOutput() {
    return T.stableInputOutput;
}

export function activeInputOutput(): Partial<Record<keyof Resources, [number, number]>> {
    return T.current.io;
}

export function forEachBuildingOfType(type: keyof Buildings, func: (xy: string, b: Entity) => void): void {
    forEach(D.buildings, (k, v) => {
        if (v.type === type) {
            func(k, v);
        }
    });
}

export function getFuelCostBase(): number {
    let cost = 1000 * cc.misc.clampf(1 - D.persisted.fuelDiscount / 100, 0, 1);
    if (D.fuelResType === "Bat" && isPolicyActive("BatteryFuelEconomy")) {
        cost /= 2;
    }
    if (D.fuelResType === "Bat" && D.map === "Osaka") {
        cost /= 2;
    }
    return cost;
}

export function getFuelCostForBuilding(from: Entity, to: Entity, cost: number): number {
    const base = getFuelCostBase() * cost * 0.00001;
    if (to.type === "Warehouse" || from.type === "Warehouse") {
        return base * (1 - getFuelCostDiscount(to));
    }
    if (isPolicyActive("FreeTransportToTradeCenter")) {
        if (from.type === "TradeCenter") {
            return base * 1.5;
        }
        if (to.type === "TradeCenter") {
            return 0;
        }
    }
    return base;
}

export function getFuelCostDiscount(entity: Entity): number {
    let discount = entity.level / (30 + 3 * entity.level);
    if (D.map === "Osaka") {
        discount *= 1.5;
    }
    return discount;
}

export function tryDeductResources(res: ResourceNumberMap): boolean {
    if (!hasEnoughResources(res)) {
        return false;
    }
    forEach(res, (k, v) => {
        tryDeductResource(k, v);
    });
    return true;
}

export function hasEnoughResources(res: ResourceNumberMap): boolean {
    let hasEnough = true;
    forEach(res, (k, v) => {
        if (!hasEnoughResource(k, v)) {
            hasEnough = false;
            return true;
        }
        return false;
    });
    return hasEnough;
}

export function tryDeductResource(res: keyof Resources, amountToDeduct: number): boolean {
    if (amountToDeduct === 0) {
        return true;
    }
    if (!hasEnoughResource(res, amountToDeduct)) {
        return false;
    }
    const amountDeducted = deductResource(res, amountToDeduct);
    if (amountDeducted !== amountToDeduct) {
        cc.warn(
            `tryDeductResource: didn't deduct enough resources. res = ${res}, amountToDeduct = ${amountToDeduct}, amountDeducted = ${amountDeducted}`
        );
    }
    return true;
}

export function hasEnoughResource(res: keyof Resources, amountToCheck: number): boolean {
    let amount = 0;
    T.resToBldCache[res].forEach((entity) => {
        amount += safeGet(entity.resources, res, 0);
    });
    return amount >= amountToCheck;
}

export function deductResource(res: keyof Resources, toDeduct: number): number {
    let deducted = toDeduct;
    for (const entity of T.resToBldCache[res]) {
        if (entity.resources[res] >= deducted) {
            entity.resources[res] -= deducted;
            return toDeduct;
        } else {
            deducted -= entity.resources[res];
            entity.resources[res] = 0;
        }
    }
    return toDeduct - deducted;
}

export function refundResource(res: keyof Resources, amount: number) {
    const entity = T.resToBldCache?.[res]?.[0];
    if (!entity) {
        tradeCenterRes(res)[res] += amount;
        return;
    }
    if (hasValue(entity.resources[res])) {
        entity.resources[res] += amount;
    } else {
        entity.resources[res] = amount;
    }
}

export function visibleResources(): (keyof Resources)[] {
    return T.visibleResources;
}

export function scaleProduction(b: keyof Buildings, attr: ("staticInput" | "staticOutput")[], scale: number) {
    const buildings: BuildingSet = { [b]: true };
    if (BLD[b].recipes) {
        forEach(BLD[b].recipes(), (k) => {
            buildings[k] = true;
        });
    }
    forEach(buildings, (building) => {
        attr.forEach((a) => {
            forEach(BLD[building][a], (k, v) => {
                BLD[building][a][k] = v * scale;
            });
        });
    });
}

export function getResDiff(r: keyof Resources) {
    if (!T.timeSeries[r] || T.timeSeries[r][1].length < 2) {
        return 0;
    }
    const series = T.timeSeries[r][1];
    return series[series.length - 1] - series[series.length - 2];
}

export function allResourcesValue(rewindTrade = false) {
    let result = keysOf(T.res).reduce((prev, k) => {
        const val = cashForBuyOrSell(k, -T.res[k]);
        return prev + val;
    }, 0);

    forEach(G.socket.myTrades, (_, trade) => {
        result += trade.price * trade.amount;
    });

    forEach(D.crowdfunding, (_, cf) => {
        result += cf.value;
    });

    if (rewindTrade) {
        result -= D.tradeProfit;
    }

    return result;
}

export function allResourcesValueForReference() {
    let result = keysOf(T.res).reduce((prev, k) => {
        return prev + D.price[k].price * T.res[k];
    }, 0);

    forEach(G.socket.myTrades, (_, trade) => {
        result += trade.price * trade.amount;
    });

    forEach(D.crowdfunding, (_, cf) => {
        result += cf.value;
    });

    return result;
}

export function upgradeAutoSellCapacityCost() {
    return BUILDING_BASE_COST * averageDepositPrice() * Math.pow(2, D.autoSellPerSec);
}

export function upgradeAutoSellConcurrencyCost() {
    return BUILDING_BASE_COST * averageDepositPrice() * Math.pow(5, D.autoSellConcurrency);
}

export function upgradeBuildingPermitCost(permit: number) {
    return (0.1 * BUILDING_BASE_COST * averageDepositPrice() * Math.pow(1.05, permit)) / buildingPermitCostDivider();
}

function buildingPermitCostDivider(): number {
    return 1 + D.persisted.buildingPermitCostDivider - 1 + D.swissBoosts.buildingPermitCostDivider - 1;
}

export function stockRating() {
    if (D.stockRating > 1.3) {
        return t("RatingBuy");
    } else if (D.stockRating > 1.1) {
        return t("RatingOutperform");
    } else if (D.stockRating > 0.9) {
        return t("RatingHold");
    } else if (D.stockRating > 0.7) {
        return t("RatingUnderperform");
    } else {
        return t("RatingSell");
    }
}

export function offlineEarningPerMin() {
    return D.cashPerSec * 60;
}

export function buildingContainsWord(k: keyof Buildings, word: string): boolean {
    if (!word) {
        return true;
    }
    const lowercase = word.toLowerCase();
    const b = BLD[k];
    if (b.name().toLowerCase().includes(lowercase)) {
        return true;
    }
    for (const _r in b.staticInput) {
        const r = _r as keyof Resources;
        if (Object.prototype.hasOwnProperty.call(b.staticInput, r) && RES[r].name().toLowerCase().includes(lowercase)) {
            return true;
        }
    }
    for (const _r in b.staticOutput) {
        const r = _r as keyof Resources;
        if (
            Object.prototype.hasOwnProperty.call(b.staticOutput, r) &&
            RES[r].name().toLowerCase().includes(lowercase)
        ) {
            return true;
        }
    }
    if (b.power > 0 && "power".includes(lowercase)) {
        return true;
    }
    return false;
}

export interface IOrder {
    name: string;
    time: number;
    validFor: number;
    resources: ResourceNumberMap;
    cashValue: number;
    markup: number;
    policyPoints: number;
    researchPoints: number;
}

const ORDER_INTERVAL = 4 * MINUTE;
export function wholesaleCenterMinimumResources() {
    let min = 8;
    if (D.map === "HongKong") {
        min = 4;
    }
    if (isPolicyActive("WholesaleCenterProducingOnly")) {
        min *= 2;
    }
    return min;
}

export function orderInterval() {
    return D.swissBoosts.wholesaleUpgrade1 ? ORDER_INTERVAL / 2 : ORDER_INTERVAL;
}

export function generateOrder(): IOrder {
    const resources: ResourceNumberMap = {};
    let availableResources = keysOf(resourcesCanBeProduced()).sort(
        (a, b) => (G.resourceTiers[a] || 0) - (G.resourceTiers[b] || 0)
    );
    if (isPolicyActive("WholesaleCenterProducingOnly")) {
        availableResources = availableResources.slice(Math.floor(availableResources.length / 2));
    }
    if (isPolicyActive("FactoryMining")) {
        availableResources = availableResources.filter((r) => !DEP[r]);
    }
    let seconds = cc.randi(30, 60 * 2);
    if (D.swissBoosts.wholesaleUpgrade1) {
        seconds *= 2;
    }
    const activeIO = activeInputOutput();
    let totalValue = 0;
    const numberOfResources = cc.randi(2, Math.min(availableResources.length, 6));
    const sliceSize = Math.ceil(availableResources.length / numberOfResources);
    for (let i = 0; i < numberOfResources; i++) {
        const pool = availableResources.slice(sliceSize * i, sliceSize * (i + 1));
        if (pool.length > 0) {
            const res = pool.randOne();
            const amount = (activeIO?.[res]?.[1] ?? cc.randf(PRODUCTION_SCALER, 2 * PRODUCTION_SCALER)) * seconds;
            resources[res] = amount;
            totalValue += amount * D.price[res].price;
        }
    }
    if (sizeOf(resources) <= 0) {
        cc.error("generateOrder: resources is empty!");
        return null;
    }
    let researchPointPerSec = getOutputAmount(G.researchLab, "RP");
    if (isPolicyActive("ResearchLabCultureInput")) {
        researchPointPerSec /= 2;
    }
    const order: IOrder = {
        name: `${FIRST_NAMES.randOne()} ${LAST_NAMES.randOne()}`,
        cashValue: totalValue,
        resources,
        time: serverNow(),
        validFor: cc.randf(5 * MINUTE, 10 * MINUTE),
        markup: cc.randf(0, 0.5),
        policyPoints: getOutputAmount(G.policyCenter, "PP") * seconds,
        researchPoints: researchPointPerSec * seconds,
    };
    return order;
}

export function wholesaleUnlocked() {
    return keysOf(resourcesCanBeProduced()).length >= wholesaleCenterMinimumResources();
}

export function resourcesCanBeProduced(): ResourceSet {
    const result: ResourceSet = {};
    forEach(D.unlockedBuildings, (k) => {
        const output = { ...BLD[k].staticOutput };
        // Resource Explorer is special, it does not affect tech unlock, so we should exclude
        // its recipes
        if (BLD[k].recipes && k !== "ResourceExplorer") {
            forEach(BLD[k].recipes(), (b) => {
                Object.assign(output, BLD[b].staticOutput);
            });
        }
        forEach(output, (r: keyof Resources) => {
            if (!canPrice(r)) {
                return;
            }
            if (!isMine(k)) {
                result[r] = true;
                return;
            }
            if (MAP[D.map].deposits[r] > 0) {
                result[r] = true;
            }
        });
    });
    if (D.unlockedBuildings.Farmland || D.unlockedBuildings.Greenhouse) {
        forEach(getAvailableCrops(), (k) => {
            result[k] = true;
        });
    }
    if (isOctober() || isHalloween()) {
        result.Pmpk = true;
    }
    return result;
}

export function resourcesBeingProduced(): (keyof Resources)[] {
    const io = stableInputOutput();
    return keysOf(io).filter((k) => canPrice(k) && io[k][1] > 0);
}

export function resourcesBeingProducedOrSold(): (keyof Resources)[] {
    const io = stableInputOutput();
    return keysOf(io).filter((k) => canPrice(k) && (io[k][1] > 0 || D.autoSellRes[k]));
}

export function ensureRecipe(entity: Entity) {
    if (BLD[entity.type].recipes) {
        const e = entity as MultipleRecipeEntity;
        const recipes = BLD[entity.type].recipes();
        if (!recipes[e.recipe] || entity.level < recipes[e.recipe]) {
            e.recipe = firstKeyOf(recipes);
        }
    }
}

export function numberOfActivePolicies(): number {
    return keysOf(D.policies).reduce(
        (prev, curr) => prev + (POLICY[curr].cost > 0 && D.policies[curr].active ? 1 : 0),
        0
    );
}

export function getPolicyCost(k: keyof Policy): number {
    const n = numberOfActivePolicies() || 1;
    const cost1 = Math.pow(1.75, n) / n;
    const cost2 = Math.pow(n, 1.5);
    return PRODUCTION_SCALER * POLICY[k].cost * Math.min(cost1, cost2);
}

export function getActivePolicyCount() {
    let count = 0;
    forEach(D.policies, (k, v) => {
        if (v.active) {
            count++;
        }
    });
    return count;
}

export function upgradePolicyPointRateCost(i: number) {
    return 0.1 * BUILDING_BASE_COST * Math.pow(1.05, i);
}

export function isProfitable(visual: EntityVisual) {
    const { margin } = profitMargin(visual);
    return margin > 0;
}

export function profitMargin(visual: EntityVisual) {
    const entity = visual.entity;
    let cost = 0;
    let price = 0;
    let fuel = 0;
    const input: { res: keyof Resources; value: number }[] = [];
    const output: { res: keyof Resources; value: number }[] = [];
    forEach(getInput(entity), (res) => {
        const value = getInputAmount(entity, res) * getPrice(res);
        if (value > 0) {
            input.push({ res, value });
        }
        cost += value;
    });
    forEach(getOutput(entity), (res) => {
        const value = getOutputAmount(entity, res) * getPrice(res);
        if (value > 0) {
            output.push({ res, value });
        }
        price += value;
    });
    if (cost === 0 || price === 0) {
        return { margin: Infinity, price, cost, fuel, input, output };
    }
    fuel = (getPrice(D.fuelResType) * visual.fuelCost) / entity.tickSec;
    return {
        margin: (price - cost - fuel) / price,
        price,
        cost,
        fuel,
        input,
        output,
    };
}

export async function prestige(map: keyof typeof MAP, prestigeCurrency: number): Promise<void> {
    if (hasActiveTrades()) {
        throw new Error(t("CancelActiveTradeFirst"));
    }
    try {
        addPrestigeCurrency(prestigeCurrency);
        const d = new GameData();
        d.persisted = D.persisted;
        d.map = map;
        d.persisted.lastTickAt = D.persisted.lastTickAt;
        await Promise.all([saveDataOverride(d)]);
    } catch (error) {
        addPrestigeCurrency(-prestigeCurrency);
        throw error;
    }
}

export function getWeeklyFreeCity(): keyof typeof MAP {
    const premiumCities = keysOf(MAP)
        .filter((k) => !!MAP[k].dlc)
        .sort();
    const id = Math.floor(Date.now() / (DAY * 7));
    return premiumCities[id % premiumCities.length];
}

export function getOfflineResearch(tick: number): number {
    if (!D.swissBoosts.offlineResearch) {
        return 0;
    }
    const input = getInputAmount(G.researchLab, "Sci", false);
    const output = getOutputAmount(G.researchLab, "RP", false);

    const amountDeducted = deductResource("Sci", input * tick);
    return (amountDeducted / input) * output;
}

export function addPrestigeCurrency(p: number): void {
    D.persisted.prestigeCurrency += p;
    D.persisted.allPrestigeCurrency += p;
}

const MIN_PRESTIGE_CURRENCY = 10;

export function getMarketCap(rewindTrade = false) {
    return getValuation(rewindTrade) * D.stockRating;
}

export function getValuation(rewindTrade = false) {
    return allResourcesValue(rewindTrade) + D.cashSpent;
}

export function getPrestigeCurrency(marketCap = getMarketCap()): number {
    const c = prestigeFormula(marketCap);
    return c < MIN_PRESTIGE_CURRENCY ? 0 : c;
}

//---------- These two needs to be adjusted together
export function prestigeFormula(n: number): number {
    return Math.cbrt(n / 1e6);
}

export function minMarketCapForPrestige() {
    return Math.pow(MIN_PRESTIGE_CURRENCY, 3) * 1e6;
}
//----------

export type NumericKeyOf<TP> = {
    [P in keyof TP]: TP[P] extends number ? P : never;
}[keyof TP];
export type BooleanKeyOf<TP> = {
    [P in keyof TP]: TP[P] extends boolean ? P : never;
}[keyof TP];

export function swissUpgradeCost(
    key: NumericKeyOf<PersistedData>,
    growthBase: number,
    step: number,
    startCost: number
) {
    return Math.pow(growthBase, (D.persisted[key] - ORIGINAL_GAMEDATA.persisted[key]) / step) * startCost;
}

export function swissBoostCost(key: NumericKeyOf<SwissBoosts>, growthBase: number, step: number, startCost: number) {
    return Math.pow(growthBase, (D.swissBoosts[key] - ORIGINAL_GAMEDATA.swissBoosts[key]) / step) * startCost;
}

const UNLOCK_REQUIREMENT = 10000;

export function getUnlockRequirement(b: keyof Buildings): number {
    return UNLOCK_REQUIREMENT * (BLD[b].research || 1);
}

export function unlockableBuildings() {
    const resources = resourcesCanBeProduced();
    const result: (keyof Buildings)[] = [];
    forEach(BLD, (k, v) => {
        if (!canBuild(k) || D.unlockedBuildings[k] || !hasDLC(v.dlc) || !isAvailable(BLD[k])) {
            return;
        }
        // FishPond is special, it needs to be built on water tile but doesn't require water as input
        if (k === "FishPond" && !MAP[D.map].deposits.Water) {
            return;
        }
        const canBeResearched = keysOf(v.staticInput).every((res) => {
            if (!canPrice(res)) {
                return true;
            }
            if (D.map === "HongKong") {
                return resources[res] || T.usableRes[res] > 0;
            }
            return resources[res];
        });
        if (canBeResearched) {
            result.push(k);
        }
    });
    return result.sort(
        (a, b) => (BLD[a].research || 1) * getCostForBuilding(a, 1) - (BLD[b].research || 1) * getCostForBuilding(b, 1)
    );
}

export function unlockResearchPoint(b: keyof Buildings) {
    return (getCostForBuilding(b, 1) * (BLD[b].research || 1)) / averageDepositPrice();
}

export function canUnlock(b: keyof Buildings) {
    keysOf(BLD[b].staticInput).every((r) => T.res[r] >= UNLOCK_REQUIREMENT);
}

export function tradeCenterRes(res: keyof Resources) {
    const tc = G.tradeCenter.resources;
    if (!hasValue(tc[res])) {
        tc[res] = 0;
    }
    return tc;
}

export function getSellRefundPercentage(): number {
    return D.persisted.sellRefundPercentage * 0.01;
}

export function getSellRefund(entity: Entity): number {
    return Math.min(D.cashSpent, getSellRefundPercentage() * buildingValue(entity));
}

export function getMaxAdjacentCount(): number {
    return MAP[D.map].gridType === "hex" ? 6 : 4;
}

export const MOVE_SPEED = 100;

export function getBuilderMoveSpeed(): number {
    return MOVE_SPEED * (1 + D.persisted.builderSpeedUpPercentage * 0.01);
}

export function getBuildingPermit(): number {
    return (
        D.buildingPermit +
        getMapExtraPermit() +
        getPolicyExtraPermit() +
        T.current.industryZonePermit +
        D.swissBoosts.extraBuildingPermit +
        D.persisted.extraBuildingPermit
    );
}

export function getMapExtraPermit(): number {
    if (D.map === "Vancouver") {
        return Math.floor(sizeOf(T.buildingCount) / 4);
    }
    if (D.map === "KansasCity") {
        return (T.buildingCount.Farmland ?? 0) / 2;
    }
    if (D.map === "Istanbul") {
        return 4;
    }
    return 0;
}

export function getPolicyExtraPermit(): number {
    let result = 0;
    if (isPolicyActive("WarehouseBuildingPermitSave")) {
        result += Math.floor((T.buildingCount.Warehouse || 0) / 2);
    }
    return result;
}

export function getBuildingCount(): number {
    let count = sizeOf(D.buildings);
    forEach(D.buildingsToConstruct, (k, v) => {
        if (v.construction !== "unpaid") {
            count++;
        }
    });
    return count;
}

export function getBuildingsThatProduces(
    res: ResourceSet,
    from: (keyof Buildings)[] = keysOf(BLD)
): Partial<Record<keyof Buildings, true>> {
    const result: Partial<Record<keyof Buildings, true>> = {};
    from.forEach((k) => {
        if (BLD[k].ignoreForPricing) {
            return;
        }
        forEach(BLD[k].staticOutput, (r) => {
            if (res[r]) {
                result[k] = true;
            }
        });
    });
    return result;
}

export function getBuildingsThatConsumes(
    res: ResourceSet,
    from: (keyof Buildings)[] = keysOf(BLD)
): Partial<Record<keyof Buildings, true>> {
    const result: Partial<Record<keyof Buildings, true>> = {};
    from.forEach((k) => {
        if (BLD[k].ignoreForPricing) {
            return;
        }
        forEach(BLD[k].staticInput, (r) => {
            if (res[r]) {
                result[k] = true;
            }
        });
    });
    return result;
}

export function isSupplyChain(input: (keyof Buildings)[]): boolean {
    return permute(input).some((buildings) => {
        return buildings.every((current, idx) => {
            if (idx === buildings.length - 1) {
                return sizeOf(BLD[current]) > 0;
            }
            const next = buildings[idx + 1];
            let match = false;
            forEach(BLD[current].staticOutput, (o) => {
                forEach(BLD[next].staticInput, (i) => {
                    if (o === i && canPrice(o) && canPrice(i)) {
                        match = true;
                        return match;
                    }
                    return false;
                });
                return match;
            });
            return sizeOf(BLD[current]) > 0 && match;
        });
    });
}

export function isStableWaterTile(xy: string) {
    const deposit = G.world.depositNodes[xy];
    if (deposit && (deposit.name as Deposit) === "Water" && !isFinite(deposit.getAttr<number>("level"))) {
        return true;
    }
    return false;
}

export function isBuildingLevelTooHigh(entity: Entity): boolean {
    const deposit = G.world.depositNodes[entity.grid];
    if (!deposit) {
        return false;
    }
    const level = deposit.getAttr<number>("level");
    if (!isFinite(level)) {
        return false;
    }
    return entity.level > level;
}

export function isFarmlandAlwaysWork(): boolean {
    return D.map === "KansasCity" && isPolicyActive("SolarPanelAlwaysWork");
}

function shouldEqual<T>(actual: T, expect: T, name: string): void {
    if (actual === expect) {
        cc.log(`✅ ${name}`);
    } else {
        cc.log(`❌ ${name}`);
    }
}

// function testIsSupplyChain() {
//     const test = (input: (keyof Buildings)[], result: boolean) => {
//         shouldEqual(isSupplyChain(input), result, `isSupplyChain = ${result}: ${input.join(",")}`);
//     };
//     test(["OilRefinery", "ComputerFactory", "ScreenFactory", "OilWell"], true);
//     test(["OilWell", "OilRefinery", "CameraFactory", "ComputerFactory"], false);
//     test(["UraniumMine", "UraniumEnrichmentPlant", "NuclearPowerPlant"], true);
//     test(["OilWell", "OilRefinery", "LiquidPropellantFactory", "RocketFactory", "AirShuttleInc"], true);
//     test(["OilWell", "OilRefinery", "LiquidPropellantFactory", "RocketFactory", "ProjectVostok"], false);
//     test(["ChromiumAlloyPlant", "StainlessSteelPlant", "TitaniumAlloyPlant", "RocketFactory"], true);
//     test(["ChromiumAlloyPlant", "SteelMill", "TitaniumAlloyPlant", "RocketFactory"], false);
//     test(["SiliconMine", "SemiconductorFab", "PhoneFactory"], true);
//     test(["SiliconMine", "SemiconductorFactory", "CircuitFoundry", "PhoneFactory"], true);
//     test(["SiliconMine", "SemiconductorFab", "CircuitFoundry", "PhoneFactory"], false);
// }

export function runAllTests() {
    // testIsSupplyChain();
}
