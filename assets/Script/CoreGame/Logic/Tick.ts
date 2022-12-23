import { D, DLC, G, hasDLC, IOfflineEarning, T } from "../../General/GameData";
import { forEach, hasValue, keysOf, MINUTE, overlap, SECOND } from "../../General/Helper";
import { t } from "../../General/i18n";
import { convertToServerTime, timeSynced } from "../../General/ServerClock";
import { showToast } from "../../UI/UISystem";
import { BuildingNumberMap, Buildings } from "../Buildings/BuildingDefinitions";
import { stringToGrid } from "../GridHelper";
import { generateRandomIsland, Maps } from "../MapDefinitions";
import { Policy } from "../PolicyDefinitions";
import { Resources } from "../ResourceDefinitions";
import { getInput, getOutput, PowerBankEntity } from "./Entity";
import { buildingHasInput } from "./Find";
import {
    BLD,
    canBuild,
    canPrice,
    generateOrder,
    getBuildingPermit,
    getOfflineResearch,
    getPolicyCost,
    isAvailable,
    MAP,
    offlineEarningPerMin,
    orderInterval,
    POLICY,
    RES,
    stableInputOutput,
    wholesaleUnlocked,
} from "./Logic";
import { tickOfflineProduction } from "./OfflineProduction";
import { getPrice, tryBuyOrSell } from "./Price";
import {
    getAutoSellAmountFor,
    getFactoryMiningDeposit,
    getInputAmount,
    getOutputAmount,
    getPowerBankCapacityLeft,
    getPowerBankChargePerTick,
    getPowerBankLeft,
    getPowerPlantScienceProduction,
    isPowerBankWorking,
} from "./Production";
import { isPolicyActive } from "./SelfContained";

export function tickBuildings() {
    // ShoppingSpree has to be ticked after everything else!
    if (isPolicyActive("ShoppingSpree")) {
        tickShoppingSpree();
    }
    if (T.tickQueue.length > 0) {
        cc.warn("T.tickQueue is not empty before tick, something is left over from last tick!");
    }
    const permits = getBuildingPermit();
    let count = 0;
    forEach(G.world.buildingVisuals, (k, v) => {
        if (hasValue(v.entity.construction)) {
            return;
        }
        if (++count > permits) {
            v.outOfPermit();
            return;
        }
        if (v.entity.highPriority) {
            T.tickQueue.unshift(k);
        } else {
            T.tickQueue.push(k);
        }
    });
    T.tickQueueLength = T.tickQueue.length;
}

export function tickPolicy(now: number) {
    const originalBuildings = new Buildings();
    const originalResources = new Resources();

    ////////// Reload Statics //////////
    Object.assign(POLICY, new Policy());
    Object.assign(MAP, new Maps());
    if (D.map === "RandomIsland") {
        generateRandomIsland();
    }
    forEach(BLD, (k, v) => {
        Object.assign(v, originalBuildings[k]);
    });
    forEach(RES, (k, v) => {
        Object.assign(v, originalResources[k]);
    });
    ///////////////////////////////////
    MAP[D.map].tick();

    forEach(D.policies, (k, v) => {
        if (!v.active) {
            return;
        }
        const policy = POLICY[k];
        if (!hasDLC(policy.dlc) || !isAvailable(policy)) {
            v.active = false;
            policy.onToggle?.(v.active);
            return;
        }
        const cost = getPolicyCost(k);
        if (G.policyCenter.resources.PP < cost) {
            v.active = false;
            policy.onToggle?.(v.active);
            return;
        }
        if (v.active) {
            POLICY[k].tick();
            G.policyCenter.resources.PP -= cost;
        }
    });
}

function tickShoppingSpree() {
    const result = stableInputOutput();
    forEach(result, (res, [input, output]) => {
        if (!canPrice(res) || output <= 0 || D.autoSellRes[res]) {
            return;
        }
        let diff = input - output;
        if (res === D.fuelResType) {
            diff = T.current.fuelCost - output;
        }
        if (D.autoSellRes[res]) {
            return;
        }
        if (diff > 0 && getPrice(res) > 0) {
            tryBuyOrSell(res, Math.abs(diff));
        }
    });
}

export function tickResources() {
    keysOf(RES).forEach((k) => {
        T.resToBldCache[k] = [];
        T.res[k] = 0;
        T.usableRes[k] = 0;
    });
    const visibleResources: Partial<Record<keyof Resources, 1>> = {};

    forEach(RES, (k, v) => {
        T.stableInputOutput[k] = [0, 0];
    });

    T.powerBanks = [];
    forEach(D.buildingsToConstruct, (xy, entity) => {
        if (!entity.construction) {
            delete D.buildingsToConstruct[xy];
            return;
        }
        if (entity.construction === "queueing") {
            G.world.constructBuilding(xy);
            return;
        }
    });

    const buildingCount: BuildingNumberMap = {};
    const workingBuildingCount: BuildingNumberMap = {};
    forEach(D.buildings, function forEachBuildings(xy, entity) {
        const building = BLD[entity.type];
        if (canBuild(entity.type)) {
            if (!buildingCount[entity.type]) {
                buildingCount[entity.type] = 0;
            }
            buildingCount[entity.type]++;
        }
        const visual = G.world.getBuildingVisual(xy);
        if (visual?.isWorking) {
            if (!workingBuildingCount[entity.type]) {
                workingBuildingCount[entity.type] = 0;
            }
            workingBuildingCount[entity.type]++;
        }
        if (entity.type === "PowerBank") {
            const pb = entity as PowerBankEntity;
            if (isPowerBankWorking(stringToGrid(pb.grid))) {
                T.powerBanks.push(pb);
            } else {
                pb.powerLeft = 0;
            }
        }
        if (building.power > 0) {
            T.stableInputOutput.Sci[1] += getPowerPlantScienceProduction(entity, true);
        }
        const deposit = getFactoryMiningDeposit(entity);
        if (deposit) {
            T.stableInputOutput[deposit][1] += getInputAmount(entity, deposit, true);
        }
        forEach(getInput(entity), (k) => {
            visibleResources[k] = 1;
            T.stableInputOutput[k][0] += getInputAmount(entity, k, true);
        });
        forEach(getOutput(entity), (k) => {
            visibleResources[k] = 1;
            T.stableInputOutput[k][1] += getOutputAmount(entity, k, true);
        });
        forEach(entity.resources, (res, amount) => {
            if (!isFinite(amount) || amount <= 0) {
                entity.resources[res] = 0;
                return;
            }
            visibleResources[res] = 1;
            T.res[res] += amount;
            if (!buildingHasInput(entity, res)) {
                T.resToBldCache[res].push(entity);
                T.usableRes[res] += amount;
            }
        });
    });
    T.buildingCount = buildingCount;
    T.workingBuildingCount = workingBuildingCount;
    forEach(D.autoSellRes, (res, _) => {
        T.stableInputOutput[res][0] += getAutoSellAmountFor(res);
    });
    forEach(T.dots, function forEachDots(_, v) {
        T.res[v.type] += v.amount;
    });
    T.powerBanks.sort((a, b) => b.powerLeft - a.powerLeft);
    forEach(T.resToBldCache, (k, v) => {
        v.sort((a, b) => b.resources[k] - a.resources[k]);
    });
    forEach(D.autoSellRes, (r) => {
        if (RES[r]) {
            visibleResources[r] = 1;
        }
    });
    T.visibleResources = keysOf(visibleResources);
    updateTimeSeries();
}

export const MAX_CHART_POINT = 60;
let timeSeriesCount = 0;

function updateTimeSeries() {
    timeSeriesCount++;

    if (timeSeriesCount <= 1) {
        return;
    }

    Object.keys(T.timeSeries).forEach((k) => {
        if (T.timeSeries[k][0].length > MAX_CHART_POINT) {
            T.timeSeries[k][0].shift();
            T.timeSeries[k][1].shift();
        }
    });

    Object.keys(T.diffTimeSeries).forEach((k) => {
        if (T.diffTimeSeries[k][0].length > MAX_CHART_POINT) {
            T.diffTimeSeries[k][0].shift();
            T.diffTimeSeries[k][1].shift();
        }
    });

    Object.keys(T.res).forEach((k) => {
        if (!T.timeSeries[k]) {
            T.timeSeries[k] = [[], []];
        }
        const series = T.timeSeries[k][1];
        T.timeSeries[k][0].push(timeSeriesCount);
        series.push(T.res[k]);

        if (!T.diffTimeSeries[k]) {
            T.diffTimeSeries[k] = [[], []];
        }
        T.diffTimeSeries[k][0].push(timeSeriesCount);
        T.diffTimeSeries[k][1].push(series.length > 1 ? series[series.length - 1] - series[series.length - 2] : 0);
    });

    if (!T.timeSeries.Power) {
        T.timeSeries.Power = [[], []];
    }
    T.timeSeries.Power[0].push(timeSeriesCount);
    T.timeSeries.Power[1].push(T.current.powerSupply + getPowerBankLeft() - T.current.powerRequired);
}

export function tickPower() {
    if (T.current.powerSupply > T.current.powerUsage) {
        T.powerBanks.some((entity) => {
            const amountToCharge = Math.min(getPowerBankChargePerTick(entity), getPowerBankCapacityLeft(entity));
            if (T.current.powerSupply - T.current.powerUsage >= amountToCharge) {
                T.current.powerUsage += amountToCharge;
                entity.powerLeft += amountToCharge;
            }
            if (T.current.powerSupply <= T.current.powerUsage) {
                return true;
            }
            return false;
        });
    }
}

let draftOfflineEarning: IOfflineEarning = null;

export async function tickOfflineEarning(clientNow: number): Promise<void> {
    const lastTickAt = D.persisted.lastTickAt;

    clientNow = Date.now();
    if (clientNow - lastTickAt >= 5 * MINUTE) {
        draftOfflineEarning = {
            start: lastTickAt,
            end: clientNow,
            cashPerMinute: offlineEarningPerMin(),
            researchPoint: getOfflineResearch(
                Math.min((clientNow - lastTickAt) / SECOND, D.persisted.offlineEarningMinutes * 60)
            ),
            production: {},
        };
    }

    if (timeSynced() && draftOfflineEarning) {
        // Check for overlap
        const draft = draftOfflineEarning;
        draftOfflineEarning = null;
        for (const o of D.offlineEarnings) {
            if (overlap([o.start, o.end], [draft.start, draft.end])) {
                cc.warn("Offline time has overlap, skipping", draft);
                return;
            }
        }
        // Check for time period
        draft.end = convertToServerTime(draft.end);
        if (draft.end - draft.start < 5 * MINUTE) {
            return;
        }
        // Valid
        D.offlineEarnings.unshift(draft);
        if (hasDLC(DLC[1])) {
            draft.production = tickOfflineProduction((draft.end - draft.start) / SECOND);
        }
        G.world.routeTo(G.centralBank.grid);
    }
}

export function tickOrder(now: number) {
    D.orders = D.orders.filter((o) => o.time + o.validFor >= now);
    if (T.lastOrderAt === 0) {
        T.lastOrderAt = now;
    }
    if (now - T.lastOrderAt >= orderInterval() && wholesaleUnlocked()) {
        T.lastOrderAt = now;
        const order = generateOrder();
        D.orders.unshift(order);
        G.audio.playPowerUp();
        showToast(t("NewOrder", { from: order.name }));
    }
}
