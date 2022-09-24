import { D, G } from "../../General/GameData";
import { forEach, nf } from "../../General/Helper";
import { t } from "../../General/i18n";
import { showToast } from "../../UI/UISystem";
import { gridEqual } from "../GridHelper";
import { DefenseCommandEntity, IBaseModule, IDefenseModule } from "../Logic/Entity";
import {
    averageDepositPrice,
    BUILDING_BASE_COST,
    DEFENSE_MODULE_BASE_COST,
    getCash,
    trySpendCash,
} from "../Logic/Logic";
import { getProductionMultiplier, getSwissMultiplier } from "../Logic/Production";

export const DEFENSE_MODULE_MIN: IDefenseModule = {
    criticalDamageChance: 0,
    criticalDamageMultiplier: 1.5,
    damage: 1000,
} as const;

export const DEFENSE_MODULE_MAX: IDefenseModule = {
    criticalDamageChance: 50,
    criticalDamageMultiplier: 10,
    damage: Infinity,
} as const;

export const DEFENSE_MODULE_STEP: IDefenseModule = {
    criticalDamageChance: 5,
    criticalDamageMultiplier: 0.5,
    damage: 1000,
} as const;

export const BASE_MODULE_MIN: IBaseModule = {
    range: 75,
    bulletSpeed: 50,
    attackSpeed: 0.5,
} as const;

export const BASE_MODULE_MAX: IBaseModule = {
    range: 325,
    bulletSpeed: 150,
    attackSpeed: 5,
} as const;

export const BASE_MODULE_STEP: IBaseModule = {
    range: 10,
    bulletSpeed: 10,
    attackSpeed: 0.5,
} as const;

export interface IWaveDefinition {
    speed: number;
    spawnDelay: number;
    totalCount: number;
    unitHp: number;
    bonusMultiplier: number;
}

export function getWaveInfo(): IWaveDefinition {
    const waveCount = D.waveCount + 1;
    return {
        speed: cc.misc.clampf(25 + Math.round(Math.pow(waveCount, 0.75)), 25, 50),
        spawnDelay: 1,
        totalCount: 10 + Math.round(Math.pow(waveCount, 0.75)),
        unitHp: 1000 * Math.pow(waveCount, 1.5) * getSwissMultiplier(),
        bonusMultiplier: 2,
    };
}

export function getModuleDamage(entity: DefenseCommandEntity, module: IDefenseModule): number {
    const level = (module.damage - DEFENSE_MODULE_MIN.damage) / DEFENSE_MODULE_STEP.damage;
    return module.damage * getProductionMultiplier(entity) * (Math.floor(level / 10) + 1);
}

export function getWaveReward(numberOfWormholes: number): number {
    const wave = getWaveInfo();
    return wave.unitHp * wave.totalCount * wave.bonusMultiplier * numberOfWormholes;
}

export function addDefenseModule(entity: DefenseCommandEntity) {
    entity.modules.push({ ...DEFENSE_MODULE_MIN });
}

export function upgradeDefenseModule(defenseModule: IDefenseModule, attribute: keyof IDefenseModule): m.Children {
    if (defenseModule[attribute] >= DEFENSE_MODULE_MAX[attribute]) {
        return m(".text-s.text-desc.uppercase.pointer.mt5", t("DefenseModuleMaxUpgrade"));
    }

    const getCost = () => getDefenseModuleCost(defenseModule);

    return m(
        ".text-s.uppercase.pointer",
        {
            class: getCash() >= getCost() ? "blue" : "text-desc",
            onclick: () => {
                // This should not happen normally
                if (defenseModule[attribute] >= DEFENSE_MODULE_MAX[attribute]) {
                    G.audio.playError();
                    return;
                }
                if (trySpendCash(getCost())) {
                    G.audio.playClick();
                    defenseModule[attribute] += DEFENSE_MODULE_STEP[attribute];
                } else {
                    G.audio.playError();
                    showToast(t("NotEnoughCash"));
                }
            },
        },
        [
            m("div", `${t("DefenseModuleUpgrade")}`),
            m("div", ["$", nf(getCost()), m("span.green", [" +", nf(DEFENSE_MODULE_STEP[attribute])])]),
        ]
    );
}

function getDefenseModuleCost(defenseModule: IDefenseModule, offset = 0): number {
    let totalUpgradeCount = offset;
    forEach(defenseModule, (k, v) => {
        totalUpgradeCount += (v - DEFENSE_MODULE_MIN[k]) / DEFENSE_MODULE_STEP[k];
    });
    return totalUpgradeCount < 0
        ? 0
        : Math.pow(1.25, totalUpgradeCount) * averageDepositPrice() * DEFENSE_MODULE_BASE_COST;
}

export function getBaseModuleCost(entity: DefenseCommandEntity, offset = 0): number {
    let totalUpgradeCount = entity.modules.length + offset;
    forEach(BASE_MODULE_STEP, (k) => {
        totalUpgradeCount += (entity[k] - BASE_MODULE_MIN[k]) / BASE_MODULE_STEP[k];
    });
    // Here it is 1 because we start with 1 free module that is included in the price
    return totalUpgradeCount < 1 ? 0 : calculateBaseModuleCost(totalUpgradeCount);
}

export function calculateBaseModuleCost(totalUpgradeCount: number): number {
    return Math.pow(2, totalUpgradeCount) * averageDepositPrice() * BUILDING_BASE_COST;
}

export function getTotalDefenseCost(entity: DefenseCommandEntity): number {
    return (
        getBaseModuleCost(entity, -1) + entity.modules.reduce((prev, curr) => prev + getDefenseModuleCost(curr, -1), 0)
    );
}

export function upgradeBaseModule(entity: DefenseCommandEntity, attribute: keyof IBaseModule): m.Children {
    if (entity[attribute] >= BASE_MODULE_MAX[attribute]) {
        return m(".text-s.text-desc.uppercase.pointer.mt5", t("DefenseModuleMaxUpgrade"));
    }
    const getCost = () => getBaseModuleCost(entity);
    return m(
        ".text-s.uppercase.pointer",
        {
            class: getCash() >= getCost() ? "blue" : "text-desc",
            onclick: () => {
                // This should not happen normally
                if (entity[attribute] >= BASE_MODULE_MAX[attribute]) {
                    G.audio.playError();
                    return;
                }
                if (trySpendCash(getCost())) {
                    G.audio.playClick();
                    entity[attribute] += BASE_MODULE_STEP[attribute];
                    if (attribute === "range" && gridEqual(G.world.playerInput.selectedGrid, entity.grid)) {
                        G.world.getBuildingVisual(entity.grid).selectOn();
                    }
                } else {
                    G.audio.playError();
                    showToast(t("NotEnoughCash"));
                }
            },
        },
        [
            m("div", `${t("DefenseModuleUpgrade")}`),
            m("div", ["$", nf(getCost()), m("span.green", [" +", BASE_MODULE_STEP[attribute]])]),
        ]
    );
}
