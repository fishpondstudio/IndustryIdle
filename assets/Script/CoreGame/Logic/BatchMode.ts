import { BatchModeOptions, D, G } from "../../General/GameData";
import { firstKeyOf, forEach, sizeOf } from "../../General/Helper";
import { gridToString, stringToGrid } from "../GridHelper";
import { Entity } from "./Entity";
import { forEachBuildingOfType, getCostForBuilding, getDowngradeCost, getUpgradeCost, getSellRefundPercentage, trySpendCash, refundCash } from "./Logic";

export function getAdjacentIncludeSelf(entity: Entity): Record<string, true> {
    const result: Record<string, true> = { [entity.grid]: true };
    G.grid.getAdjacent(stringToGrid(entity.grid)).forEach((grid) => {
        const e = D.buildings[gridToString(grid)];
        if (e?.type === entity.type) {
            result[gridToString(grid)] = true;
        }
    });
    return result;
}

export function getCluster(entity: Entity): Record<string, true> {
    const toCheck: Record<string, true> = { [entity.grid]: true };
    const checked: Record<string, true> = {};
    const result: Record<string, true> = {};
    while (sizeOf(toCheck) > 0) {
        const xy = firstKeyOf(toCheck);
        delete toCheck[xy];
        checked[xy] = true;
        if (D.buildings[xy].type === entity.type) {
            result[xy] = true;
            G.grid.getAdjacent(stringToGrid(xy)).forEach((grid) => {
                const e = D.buildings[gridToString(grid)];
                if (e?.type === entity.type) {
                    const adjacentXy = gridToString(grid);
                    result[adjacentXy] = true;
                    if (!checked[adjacentXy]) {
                        toCheck[adjacentXy] = true;
                    }
                }
            });
        }
    }
    return result;
}

export function batchApply(entity: Entity, func: (entity: Entity) => void) {
    if (D.persisted.batchMode === "all") {
        return forEachBuildingOfType(entity.type, (xy, entity) => func(entity));
    }
    if (D.persisted.batchMode === "adjacent") {
        const adjacent = getAdjacentIncludeSelf(entity);
        return forEach(adjacent, (xy) => {
            func(D.buildings[xy]);
        });
    }
    const cluster = getCluster(entity);
    return forEach(cluster, (xy) => {
        func(D.buildings[xy]);
    });
}

export function batchModeLabel(): string {
    return BatchModeOptions[D.persisted.batchMode]();
}

export function getBatchUpgradeEstimate(entity: Entity, toLevel: number): { count: number; cost: number } {
    let count = 0;
    let cost = 0;
    batchApply(entity, (e) => {
        if (e.type === entity.type && e.level < toLevel) {
            count++;
            cost += getUpgradeCost(e.level, toLevel - e.level, (l) => getCostForBuilding(e.type, l));
        }
    });
    return { count, cost };
}

export function getBatchDowngradeEstimate(entity: Entity, toLevel: number): { count: number; gain: number } {
    let count = 0;
    let gain = 0;
    batchApply(entity, (e) => {
        if (e.type === entity.type && e.level > toLevel) {
            count++;
            gain += getDowngradeCost(e.level, e.level - toLevel, (l) => Math.min(D.cashSpent, getCostForBuilding(e.type, l) * getSellRefundPercentage()));
        }
    });
    return { count, gain };
}

export function doBatchUpgrade(entity: Entity, toLevel: number): { success: number; fail: number; cost: number } {
    let success = 0;
    let fail = 0;
    let cost = 0;
    batchApply(entity, (e) => {
        if (e.type === entity.type && e.level < toLevel) {
            const toSpend = getUpgradeCost(e.level, toLevel - e.level, (l) => getCostForBuilding(entity.type, l));
            if (trySpendCash(toSpend)) {
                success++;
                cost += toSpend;
                e.level = toLevel;
            } else {
                fail++;
            }
        }
    });
    return { success, fail, cost };
}

export function doBatchDowngrade(entity: Entity, toLevel: number) : { success: number; fail: number; gain: number } {
    let success = 0;
    let fail = 0;
    let gain = 0;
    batchApply(entity, (e) => {
        if (e.type === entity.type && e.level > toLevel) {            
            const toRefund = getDowngradeCost(e.level, e.level - toLevel, (l) => Math.min(D.cashSpent, getCostForBuilding(entity.type, l) * getSellRefundPercentage()));
            refundCash(toRefund);
            success++;
            gain += toRefund;
            e.level = toLevel;
        }
    });
    return { success, fail, gain };
}

export function doBatchSellEstimate(entity: Entity): { count: number; gain: number } {
    let count = 0;
    let gain = 0;
    batchApply(entity, (e) => {
        if (e.type === entity.type) {
            count++;
            gain += getCostForBuilding(entity.type, e.level) * getSellRefundPercentage();
        }
    });
    return { count, gain };
}

export function doBatchSell(entity: Entity): { success: number; fail: number; gain: number } {
    let success = 0;
    let fail = 0;
    let gain = 0;
    batchApply(entity, (e) => {
        if (e.type === entity.type) {
            const refund = getCostForBuilding(e.type, e.level) * getSellRefundPercentage();
            success++;
            gain += refund;
            refundCash(refund);
            delete D.buildings[e.grid];
            G.world.removeBuilding(stringToGrid(e.grid));
        } else {
            fail++;
        }
    });
    return { success, fail, gain };
}
