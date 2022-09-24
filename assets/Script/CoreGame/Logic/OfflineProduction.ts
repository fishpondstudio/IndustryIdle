import { D } from "../../General/GameData";
import { forEach, sizeOf } from "../../General/Helper";
import { Buildings, ResourceNumberMap } from "../Buildings/BuildingDefinitions";
import { CAPACITOR_SIZE } from "../ResourceDefinitions";
import { Entity, getInput, getOutput } from "./Entity";
import { addResourceTo, deductFromAssertEnough, ORIGINAL_BLD } from "./Logic";
import { getOfflineInputAmount, getOfflineOutputAmount, getOfflinePower } from "./Production";

export function tickOfflineProduction(ticks: number): ResourceNumberMap {
    const result: ResourceNumberMap = {};
    forEach(D.buildings, (xy, entity) => {
        if (!qualifyForOfflineProduction(entity.type)) {
            return;
        }
        const b = ORIGINAL_BLD[entity.type];
        if (b.tickOfflineEarning) {
            const production = b.tickOfflineEarning(entity, ticks);
            forEach(production, (k, v) => {
                result[k] ? (result[k] += v) : (result[k] = v);
            });
            return;
        }
        const actualTicks = Math.min(ticks, getOfflineProductionSecond(entity));
        if (actualTicks < 1) {
            return;
        }
        const inputMultiplier = getOfflineInputAmount(entity);
        const outputMultiplier = getOfflineOutputAmount(entity);
        deductCapacitor(entity, actualTicks);
        forEach(getInput(entity), (k, v) => {
            const amount = v * inputMultiplier * actualTicks;
            deductFromAssertEnough(entity, k, amount, true);
        });
        forEach(getOutput(entity), (k, v) => {
            const amount = v * outputMultiplier * actualTicks;
            addResourceTo(entity, k, amount, true);
            result[k] ? (result[k] += amount) : (result[k] = amount);
        });
    });
    return result;
}

export function qualifyForOfflineProduction(building: keyof Buildings) {
    const b = ORIGINAL_BLD[building];
    if (b.tickOfflineEarning) {
        return true;
    }
    return sizeOf(b.staticOutput) > 0 && b.power < 0 && !b.staticOutput.Cap && !b.staticOutput.Cap;
}

export function getOfflineProductionSecond(entity: Entity, input: ResourceNumberMap = getInput(entity)): number {
    if (qualifyForOfflineProduction(entity.type) && entity.resources.Cap > 0) {
        let ticks = (CAPACITOR_SIZE * entity.resources.Cap) / -getOfflinePower(entity);
        forEach(input, (res, amount) => {
            const t = (entity.resources?.[res] ?? 0) / (getOfflineInputAmount(entity) * amount);
            if (t < ticks) {
                ticks = t;
            }
        });
        return Math.min(ticks, D.persisted.offlineEarningMinutes * 60);
    }
    return 0;
}

export function deductCapacitor(entity: Entity, ticks: number) {
    const amount = (-getOfflinePower(entity) * ticks) / CAPACITOR_SIZE;
    deductFromAssertEnough(entity, "Cap", amount, false);
}
