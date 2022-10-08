import { D, G, IBoostCache, T } from "../../General/GameData";
import {
    firstKeyOf,
    forEach,
    hashCode,
    hasValue,
    keysOf,
    lastOf,
    minOf,
    murmurhash3,
    propertyEqual,
    sizeOf,
} from "../../General/Helper";
import { BuildingNumberMap, Buildings, BuildingSet, ResourceNumberMap } from "../Buildings/BuildingDefinitions";
import { gridToString, stringToGrid } from "../GridHelper";
import { depositsToPercentage } from "../MapDefinitions";
import { Resources } from "../ResourceDefinitions";
import { SourceType } from "../WarehousePanel";
import {
    Entity,
    getInput,
    getOutput,
    IWarehouseSource,
    MultipleRecipeEntity,
    PowerBankEntity,
    ResourceExplorerEntity,
    WarehouseEntity,
} from "./Entity";
import {
    BLD,
    buildingOnlyInputDeposits,
    canBuild,
    COMMON_DEP,
    DEP,
    Deposit,
    isAvailable,
    isMine,
    MAP,
    NoEfficiency,
    ORIGINAL_BLD,
} from "./Logic";
import { isPolicyActive } from "./SelfContained";

export function baselineAutoSellCapacity() {
    return getAutoSellCapacityPercentage() * 100 * 100 * getSwissMultiplier();
}

export function getAutoSellAmountFor(resource: keyof Resources): number {
    return Math.max((T.current.io?.[resource]?.[1] ?? 0) * getAutoSellCapacityPercentage(), baselineAutoSellCapacity());
}

export function getAutoSellCapacityPercentage(): number {
    D.autoSellPerSec = cc.misc.clampf(D.autoSellPerSec, 1, 40);
    D.persisted.autoSellCapacityMultiplier = cc.misc.clampf(D.persisted.autoSellCapacityMultiplier, 0, 25);
    D.swissBoosts.autoSellCapacityMultiplier = cc.misc.clampf(D.swissBoosts.autoSellCapacityMultiplier, 0, 25);
    return (D.autoSellPerSec + D.persisted.autoSellCapacityMultiplier + D.swissBoosts.autoSellCapacityMultiplier) / 100;
}

//---------------- Production Multipliers ----------------

export const PRODUCTION_SCALER = 10;

export function getTileModifier(xy: string, type: keyof Buildings): number {
    if (
        isMine(type) ||
        !canBuild(type) ||
        isPolicyActive("NoTileModifier") ||
        type === "IndustryZone" ||
        type === "GeothermalPowerPlant" ||
        type === "CristoRedentor"
    ) {
        return 0;
    }
    let value = (murmurhash3(xy + type, hashCode(D.seed)) % 10001) / 10000 - 0.5; // -0.5 ~ 0.5
    if (D.map === "SanJose" && BLD[type].staticInput.Si > 0) {
        value = 0.5;
    }
    if (isPolicyActive("SantaClauseIsComing") && type === "SantaFactory") {
        value = 0.5;
    }
    const maxTileModifier = isPolicyActive("AdjacentBonusSquare") ? 0.15 : 0.25;
    value = (Math.round((100 * maxTileModifier * value) / 2.5) * 5) / 100;
    // Get rid of -0
    value = value === 0 ? Math.abs(value) : value;
    value = isPolicyActive("DoubleTileModifier") ? 2 * value : value;
    value = isPolicyActive("TileModifierOutputOnly") ? value / 2 : value;
    return value;
}

export function canApplyProductionMultiplier(entity: Entity): boolean {
    if (entity.type === "ResourceBooster" || entity.type === "IndustryZone") {
        return false;
    }
    return true;
}

export function getSwissMultiplier(): number {
    return 1 + (D.persisted.productionMultiplier - 1) + (D.swissBoosts.productionMultiplier - 1);
}

export function getProductionMultiplier(entity: Entity): number {
    const m = canApplyProductionMultiplier(entity)
        ? getSwissMultiplier() + getMapProductionMultiplier() + getIndustryZoneMultiplier(entity)
        : 1;
    return PRODUCTION_SCALER * m;
}

export function getMapProductionMultiplier(): number {
    if (D.map === "Vancouver" && isPolicyActive("ProductionDiversification")) {
        return sizeOf(T.buildingCount) / 100;
    }
    return 0;
}

export function getUpgradeMultiplier(entity: Entity): number {
    if (entity.type === "ResourceBooster") {
        return 1;
    }
    return Math.floor(entity.level / 10) + 1;
}

export function getWarehouseTotalCapacity(entity: WarehouseEntity): number {
    let capacity = getBaseOutputAmount(entity) * 10;
    if (isPolicyActive("HighSpeedWarehouse")) {
        capacity *= 2;
    }
    return capacity;
}

export function getWarehouseTotalWeight(routes: Record<string, IWarehouseSource>): number {
    let totalWeight = 0;
    forEach(routes, (_, s) => {
        totalWeight += s.weight;
    });
    return totalWeight;
}

export function getWarehouseRouteCapacity(
    entity: WarehouseEntity,
    direction: SourceType,
    route: IWarehouseSource
): number {
    return (getWarehouseTotalCapacity(entity) * route.weight) / getWarehouseTotalWeight(entity[direction]);
}

/**
 * This returns the "real capacity" based on current available resources
 * in this warehouse
 */
export function getWarehouseTargetRealCapacity(
    entity: WarehouseEntity,
    cumulatedTicks: number,
    target: IWarehouseSource
): number {
    let totalWeight = 0;
    let resourceWeight = 0;
    forEach(entity.target, (_, r) => {
        totalWeight += r.weight;
        if (r.res === target.res) {
            resourceWeight += r.weight;
        }
    });
    const totalCapacity = getWarehouseTotalCapacity(entity) * cumulatedTicks;
    const requiredAmount = (totalCapacity * resourceWeight) / totalWeight;

    // We have enough resource in the warehouse
    if (entity.resources[target.res] >= requiredAmount) {
        return (totalCapacity * target.weight) / totalWeight;
    }
    // If not, we divide the available resources amount targets
    return ((entity.resources[target.res] ?? 0) * target.weight) / resourceWeight;
}

export function getOfflineInputAmount(entity: Entity, applyTileModifier = true): number {
    const tileModifier = applyTileModifier ? 1 + getTileModifier(entity.grid, entity.type) : 1;
    return getUpgradeMultiplier(entity) * entity.level * getProductionMultiplier(entity) * tileModifier;
}

export function getBaseInputAmount(entity: Entity, stable = false): number {
    let input = 0;
    if (isPolicyActive("TileModifierOutputOnly") && !NoEfficiency[entity.type]) {
        input = getOfflineInputAmount(entity, false);
    } else {
        input = getOfflineInputAmount(entity, true);
    }
    // If AdjacentBonusOnlyOutput is not active, or the building is on blacklist, then apply bonus to input
    const adjacentBonus =
        isPolicyActive("AdjacentBonusOnlyOutput") && !NoEfficiency[entity.type]
            ? 1
            : 1 + getAdjacentCount(entity.grid, stable) * getAdjacentBonus();
    input *= adjacentBonus;
    if (entity.type === "ResourceBooster" && T.buildingCount.ResourceBooster > 0) {
        input *= T.buildingCount.ResourceBooster;
    }
    if (entity.type === "ResourceBooster" && isPolicyActive("ResourceBoosterSquare")) {
        input *= 1.25;
    }
    if (entity.type === "ResourceBooster" && isPolicyActive("ResourceBoosterSupplyChain")) {
        input *= 2;
    }
    input *= 1 + getBoostAmount(stable ? T.current.boostsStable : T.current.boosts, entity.grid, entity.type)[0];
    return input;
}

export function getInputAmount(entity: Entity, resource: keyof Resources, stable = false): number {
    let m = getInput(entity)[resource] ?? 0;
    const news = D.marketNews[resource];
    if (!stable && news && (news.filter === "input" || news.filter === "both")) {
        m *= 1 + news.modifier * (isPolicyActive("NewsEffectx2") ? 1.5 : 1);
    }
    return getBaseInputAmount(entity, stable) * m;
}

export function getOfflineOutputAmount(entity: Entity): number {
    const tileModifier = 1 + getTileModifier(entity.grid, entity.type);
    return getUpgradeMultiplier(entity) * entity.level * getProductionMultiplier(entity) * tileModifier;
}

export function getBaseOutputAmount(entity: Entity, stable = false): number {
    const adjacentBonus = 1 + getAdjacentCount(entity.grid, stable) * getAdjacentBonus();
    let output = getOfflineOutputAmount(entity) * adjacentBonus;
    if (entity.type === "ResourceExplorer" && isPolicyActive("ResourceExplorer2")) {
        output *= 2;
    }
    if (entity.type === "ResourceBooster" && isPolicyActive("ResourceBoosterSquare")) {
        output *= 1.25;
    }
    if (entity.type === "ResourceExplorer" && isPolicyActive("AdjacentExplorer")) {
        const re = entity as ResourceExplorerEntity;
        const outputAdjacentDeposit = G.grid
            .getAdjacent(stringToGrid(entity.grid))
            .some((xy) => getOutput(re)[G.world.depositNodes[gridToString(xy)]?.name]);
        if (outputAdjacentDeposit) {
            output *= 2;
        }
    }
    output *= 1 + getBoostAmount(stable ? T.current.boostsStable : T.current.boosts, entity.grid, entity.type)[1];
    return output;
}

export function getOutputAmount(entity: Entity, resource: keyof Resources, stable = false): number {
    let m = getOutput(entity)[resource] || 0;
    const news = D.marketNews[resource];
    if (!stable && news && (news.filter === "output" || news.filter === "both")) {
        m *= 1 + news.modifier * (isPolicyActive("NewsEffectx2") ? 1.5 : 1);
    }
    return getBaseOutputAmount(entity, stable) * m;
}

export function getIndustryZoneMultiplier(entity: Entity): number {
    if (T.current.industryZoneTier[entity.grid] > 0) {
        return (
            T.current.industryZoneTier[entity.grid] *
            (D.swissBoosts.industryZoneCapacityBooster + D.persisted.industryZoneCapacityBooster)
        );
    }
    return 0;
}

export function getPowerBankCapacityMultiplier(): number {
    return isPolicyActive("PowerBankMoreCapacity") ? 75 * 2 : 50;
}

export function getResourceBoosterPercentage(entity: Entity, stable = false): number {
    return getBaseOutputAmount(entity, stable) / 100;
}

export function getPowerBankChargePerTick(entity: PowerBankEntity): number {
    const policy = isPolicyActive("PowerBankMoreCapacity") ? 0.5 : 1;
    return (
        policy *
        (1 + getTileModifier(entity.grid, entity.type)) *
        getUpgradeMultiplier(entity) *
        entity.level *
        getProductionMultiplier(entity) *
        (1 + getAdjacentCount(entity.grid) * getAdjacentBonus())
    );
}

export function getPowerBankCapacityLeft(entity: PowerBankEntity): number {
    return getPowerBankCapacityMultiplier() * getPowerBankChargePerTick(entity) - entity.powerLeft;
}

export function getRecipe(entity: Entity): keyof Buildings {
    if (BLD[entity.type].recipes) {
        const mre = entity as MultipleRecipeEntity;
        return mre.recipe;
    }
    return entity.type;
}

function getBasePower(entity: Entity): number {
    if (BLD[entity.type].recipes) {
        const mre = entity as MultipleRecipeEntity;
        return BLD[mre.recipe]?.power ?? BLD[entity.type].power;
    }
    return BLD[entity.type].power;
}

export function getOfflinePower(entity: Entity): number {
    const upgradeMultiplier = getUpgradeMultiplier(entity);
    const buildingPower = getBasePower(entity);
    const power = buildingPower * entity.level * getProductionMultiplier(entity);
    if (buildingPower > 0) {
        const tileMultiplier = 1 + getTileModifier(entity.grid, entity.type);
        return power * upgradeMultiplier * tileMultiplier;
    }
    return power * Math.pow(1.25, upgradeMultiplier);
}

export function getPower(entity: Entity, stable = false): number {
    const buildingPower = getBasePower(entity);
    const visual = G.world.getBuildingVisual(entity.grid);
    // Not built yet
    if (!visual) {
        return 0;
    }
    if (!stable && (visual.notEnoughPermit || visual.notEnoughResources || entity.turnOff)) {
        return 0;
    }
    // Power Plant
    if (buildingPower > 0) {
        const adjacentBonus = 1 + getAdjacentCount(entity.grid, stable) * getAdjacentBonus();
        const boosterCache = stable ? T.current.boostsStable : T.current.boosts;
        const boosterAmount = 1 + getBoostAmount(boosterCache, entity.grid, entity.type)[1];
        let p = getOfflinePower(entity) * adjacentBonus * boosterAmount;
        if (entity.type === "SolarPanel") {
            if (isPolicyActive("SolarPanelAlwaysWork")) {
                p = 0.4 * p;
            } else if (stable) {
                p = 0.5 * p;
            } else {
                p = T.tickCount % 10 < 5 ? p : 0;
            }
        }
        if (entity.type === "WindTurbine") {
            if (isPolicyActive("WindTurbineAlwaysWork")) {
                p = 0.7 * p;
            } else if (stable) {
                p = 0.8 * p;
            } else {
                const seed = stringToGrid(entity.grid);
                p = (seed.x * seed.y + T.tickCount) % 10 < 2 ? 0 : p;
            }
        }
        return p;
    }
    // Power consumers
    if (entity.type === "CapacitorFactory") {
        return buildingPower * getOutputAmount(entity, "Cap");
    }
    let power = getOfflinePower(entity);
    power *= 1 + getBoostAmount(stable ? T.current.boostsStable : T.current.boosts, entity.grid, entity.type)[0];
    if (!isPolicyActive("TileModifierOutputOnly")) {
        const tileMultiplier = 1 + getTileModifier(entity.grid, entity.type);
        power = power * tileMultiplier;
    }
    // Warehouse
    if (entity.type === "Warehouse") {
        const e = entity as WarehouseEntity;
        power = Math.sqrt(Object.keys(e.source).length) * power;
        if (isPolicyActive("HighSpeedWarehouse")) {
            power *= 2;
        }
    }
    // ResourceExplorer
    if (entity.type === "ResourceExplorer") {
        const re = entity as ResourceExplorerEntity;
        const p = depositsToPercentage(MAP[D.map].deposits);
        let percent = p[firstKeyOf(getOutput(re))];
        if (!percent) {
            percent = minOf(Object.values(p));
        }
        power = power / percent;
        if (isPolicyActive("ResourceExplorer2")) {
            power *= 2;
        }
    }
    // ResourceBooster
    if (entity.type === "ResourceBooster") {
        if (isPolicyActive("ResourceBoosterSquare")) {
            power *= 1.25;
        }
        if (isPolicyActive("ResourceBoosterSupplyChain")) {
            power *= 2;
        }
    }
    // Factories
    if (isPolicyActive("AdjacentBonusOnlyOutput")) {
        return power * (1 + getAdjacentCount(entity.grid, stable) * getAdjacentBonus());
    }
    return power;
}

//-----------------------------------------------------

export function getPowerPlantScienceProduction(entity: Entity, stable = false): number {
    const power = getPower(entity, stable);
    if (power <= 0) {
        return 0;
    }
    return Math.log(power);
}

export function hasEnoughPower(power: number): boolean {
    return T.current.powerSupply + getPowerBankLeft() - T.current.powerUsage > power;
}

export function getPowerBalance(): number {
    if (!T.timeSeries.Power) {
        return 0;
    }
    return lastOf(T.timeSeries.Power[1]);
}

export function getPowerBankLeft() {
    return T.powerBanks.reduce((prev, curr) => prev + curr.powerLeft, 0);
}

export function getFactoryMiningDeposit(entity: Entity): Deposit | null {
    if (!isPolicyActive("FactoryMining")) {
        return null;
    }
    const deposit = G.world.depositNodes[entity.grid];
    if (!deposit) {
        return null;
    }
    const d = deposit.name as Deposit;
    const b = BLD[entity.type];
    if (b.staticInput[d] > 0) {
        return d;
    }
    return null;
}

export function tryDeductPower(power: number): boolean {
    if (!hasEnoughPower(power)) {
        return false;
    }
    const balance = T.current.powerSupply - T.current.powerUsage;
    if (balance >= power) {
        T.current.powerUsage += power;
        return true;
    }
    let amountLeft = power - balance;
    T.current.powerUsage = T.current.powerSupply;
    T.powerBanks.some((entity) => {
        if (entity.powerLeft >= amountLeft) {
            entity.powerLeft -= amountLeft;
            amountLeft = 0;
            return true;
        }
        amountLeft -= entity.powerLeft;
        entity.powerLeft = 0;
        return false;
    });
    if (amountLeft > 0) {
        cc.warn(`deductPower thinks there's enough power but didn't deduct enough, balance = ${amountLeft}`);
    }
    return true;
}

export function hasOutputOnAllMaps(res: keyof Resources): boolean {
    if (DEP[res]) {
        return COMMON_DEP[res];
    }
    return keysOf(ORIGINAL_BLD).some((b) => {
        const bld = ORIGINAL_BLD[b];
        return bld.staticOutput[res] > 0 && !hasValue(bld.available);
    });
}

export function hasInputOnAllMaps(res: keyof Resources): boolean {
    if (DEP[res]) {
        return COMMON_DEP[res];
    }
    return keysOf(ORIGINAL_BLD).some((b) => {
        const bld = ORIGINAL_BLD[b];
        return bld.staticInput[res] > 0 && !hasValue(bld.available);
    });
}

export function hasOutputOnCurrentMap(res: keyof Resources): boolean {
    if (DEP[res]) {
        return MAP[D.map].deposits[res] > 0;
    }
    return keysOf(ORIGINAL_BLD).some((b) => {
        const bld = ORIGINAL_BLD[b];
        return bld.staticOutput[res] > 0 && isAvailable(bld);
    });
}

export function hasInputOnCurrentMap(res: keyof Resources): boolean {
    if (DEP[res]) {
        return MAP[D.map].deposits[res] > 0;
    }
    return keysOf(ORIGINAL_BLD).some((b) => {
        const bld = ORIGINAL_BLD[b];
        return bld.staticInput[res] > 0 && isAvailable(bld);
    });
}

export function getAdjacentBonus(): number {
    let b = 0.1 + D.persisted.extraAdjacentBonus / 100;
    if (isPolicyActive("AdjacentBonusSquare")) {
        b *= 1.5;
    }
    if (isPolicyActive("AdjacentBonusOnlyOutput")) {
        b *= 0.5;
    }
    return b;
}

export function getAdjacentCount(xy: string, stable = false): number {
    const building = D.buildings[xy];
    if (!building) {
        return 0;
    }
    const cache = stable ? T.stableAdjacentCount : T.adjacentCount;
    if (hasValue(cache[xy])) {
        return cache[xy];
    }
    let count = 0;
    G.grid.getAdjacent(stringToGrid(xy)).forEach((grid) => {
        const xy = gridToString(grid);
        const visual = G.world.getBuildingVisual(xy);
        const entity = D.buildings[xy];
        if (!visual || !entity) {
            return;
        }
        // Entity needs to be working, or "stable" flag is true
        if (!visual.isWorking && !stable) {
            return;
        }
        if (isOfSameType(building, entity)) {
            count++;
        }
    });
    cache[xy] = count;
    return count;
}

export const NoAdjacentBonus: BuildingSet = {
    IndustryZone: true,
    ResourceExplorer: true,
    CristoRedentor: true,
};

function isOfSameType(a: Entity, b: Entity): boolean {
    if (!canBuild(a.type) || !canBuild(b.type)) {
        return false;
    }
    if (a.type === "CristoRedentor") {
        return a.level >= b.level;
    }
    if (b.type === "CristoRedentor") {
        return b.level >= a.level;
    }
    if (NoAdjacentBonus[a.type] || NoAdjacentBonus[b.type]) {
        return false;
    }
    if (a.type !== b.type) {
        return false;
    }
    if (!propertyEqual(a, b, "outputResource")) {
        return false;
    }
    if (!propertyEqual(a, b, "recipe")) {
        return false;
    }
    return true;
}

export function getIndustryZoneBoostAmount(entity: Entity): number {
    if (entity.type !== "IndustryZone") {
        cc.warn("You are trying to call `industryZoneBoostAmount` on an entity that is not Industry Zone!");
        return 0;
    }
    const tier = T.current.industryZoneTier[entity.grid];
    if (!tier) {
        return 0;
    }
    return 0.1 * (tier + Math.floor(entity.level / 10));
}

export function calculateResourceBooster(entity: Entity, stable: boolean) {
    if (entity.type !== "ResourceBooster") {
        cc.warn("You are trying to calculate boost for a non-resource booster!");
        return;
    }
    const boostPercentage = getResourceBoosterPercentage(entity, stable);
    const cacheToWrite = stable ? T.next.boostsStable : T.next.boosts;
    const resourceOutput: ResourceNumberMap = {};
    getBoostableBuildings(stringToGrid(entity.grid)).forEach((mine) => {
        if (isPolicyActive("ResourceBoosterSupplyChain") && (stable || G.world.buildingVisuals[mine.grid].isWorking)) {
            const res = getMineOutput(mine.type);
            if (!resourceOutput[res]) {
                resourceOutput[res] = 0;
            }
            resourceOutput[res]++;
        }
        addBoostAmount(cacheToWrite, mine.grid, mine.type, [boostPercentage, boostPercentage]);
    });
    if (isPolicyActive("ResourceBoosterSupplyChain")) {
        G.grid
            .getAdjacent(stringToGrid(entity.grid))
            .map((grid) => gridToString(grid))
            .filter((grid) => qualifedForSupplyChainBooster(D.buildings[grid]))
            .sort((a, b) => {
                return D.buildings[b].level - D.buildings[a].level;
            })
            .forEach((grid) => {
                const target = D.buildings[grid];
                forEach(resourceOutput, (k) => {
                    if (resourceOutput[k] > 0 && canReceiveBoostFrom(target, k)) {
                        addBoostAmount(cacheToWrite, target.grid, target.type, [boostPercentage, boostPercentage]);
                        resourceOutput[k]--;
                        return true;
                    }
                    return false;
                });
            });
    }
}

export function getGenericBoostPercentage(entity: Entity): number {
    return entity.level * 0.05;
}

function qualifedForSupplyChainBooster(entity: Entity) {
    if (!entity) {
        return false;
    }
    if (entity.turnOff) {
        return false;
    }
    if (isPolicyActive("ResourceExplorer2") && entity.type === "ResourceExplorer") {
        return true;
    }
    if (buildingOnlyInputDeposits(entity.type)) {
        return true;
    }
    return false;
}

function canReceiveBoostFrom(entity: Entity, res: keyof Resources) {
    if (BLD[entity.type].staticInput[res]) {
        return true;
    }
    if (isPolicyActive("ResourceExplorer2") && entity.type === "ResourceExplorer" && getOutput(entity)[res]) {
        return true;
    }
    return false;
}

export function addBoostAmount(
    data: IBoostCache,
    xy: string,
    building: keyof Buildings,
    inputAndOutput: [number, number]
) {
    if (!data[xy]) {
        data[xy] = {};
    }
    if (!data[xy][building]) {
        data[xy][building] = [0, 0];
    }
    data[xy][building][0] += inputAndOutput[0];
    data[xy][building][1] += inputAndOutput[1];
}

export function getBoostAmount(data: IBoostCache, xy: string, building: keyof Buildings): [number, number] {
    return data?.[xy]?.[building] || [0, 0];
}

export function getMineOutput(b: keyof Buildings): keyof Resources {
    if (isMine(b)) {
        return keysOf(BLD[b].staticOutput)[0];
    }
    return null;
}

export function getAdjacentGroupByType(grid: cc.Vec3): BuildingNumberMap {
    const result: BuildingNumberMap = {};
    G.grid.getAdjacent(grid).forEach((g) => {
        const t = D.buildings[gridToString(g)]?.type;
        if (!t) {
            return;
        }
        if (!result[t]) {
            result[t] = 1;
        } else {
            result[t]++;
        }
    });
    return result;
}

export function isPowerBankWorking(grid: cc.Vec3): boolean {
    return G.grid.getAdjacent(grid).some((g) => {
        const t = D.buildings[gridToString(g)]?.type;
        if (t) {
            return BLD[t].power > 0;
        }
        return false;
    });
}

export function getBoostableBuildings(grid: cc.Vec3): Entity[] {
    const xy = gridToString(grid);
    if (T.adjacentMines[xy]) {
        return T.adjacentMines[xy];
    }
    const result: Entity[] = [];
    G.grid.getAdjacent(grid).forEach((g) => {
        const t = D.buildings[gridToString(g)];
        if (t && canBoostBuilding(t)) {
            result.push(t);
        }
    });
    T.adjacentMines[xy] = result;
    return result;
}

function canBoostBuilding(entity: Entity): boolean {
    if (isMine(entity.type)) {
        return true;
    }
    if (entity.type === "Farmland") {
        return true;
    }
    if (D.map === "RioDeJaneiro") {
        return entity.type === "PigFarm" || entity.type === "ChickenFarm" || entity.type === "CowFarm";
    }
    return false;
}
