import { D, DLC, G, T } from "../../General/GameData";
import { assert, forEach, formatPercent, getOrSet, hasValue, keysOf } from "../../General/Helper";
import { t } from "../../General/i18n";
import { TradeCenterPage } from "../../UI/TradeCenterPage";
import { FarmlandPanel } from "../FarmlandPanel";
import { gridToString, stringToGrid } from "../GridHelper";
import { IndustryZonePanel } from "../IndustryZonePanel";
import { batchApply, batchModeLabel } from "../Logic/BatchMode";
import { DefenseCommandEntity, FarmlandEntity, FlourMillEntity, getOutput, WarehouseEntity } from "../Logic/Entity";
import {
    addResourceTo,
    BLD,
    DEP,
    Deposit,
    ensureRecipe,
    getAvailableCrops,
    isFarmlandAlwaysWork,
    isOctober,
    isStableWaterTile,
    isSupplyChain,
    MAP,
    NoEfficiency,
    RES,
    validateWarehouse,
} from "../Logic/Logic";
import { tryBuyOrSell } from "../Logic/Price";
import {
    addBoostAmount,
    calculateResourceBooster,
    getAutoSellAmountFor,
    getBoostableBuildings,
    getGenericBoostPercentage,
    getIndustryZoneBoostAmount,
    getOfflineOutputAmount,
    getPower,
    getRecipe,
    getWarehouseTargetRealCapacity,
    getWarehouseTotalCapacity,
    getWarehouseTotalWeight,
    hasEnoughPower,
    isPowerBankWorking,
    tryDeductPower,
} from "../Logic/Production";
import { isPolicyActive } from "../Logic/SelfContained";
import { PowerBankPanel } from "../PowerBankPanel";
import { ResourceBoosterPanel } from "../ResourceBoosterPanel";
import { DefenseCommandPanel } from "../TowerDefense/DefenseCommandPanel";
import { WarehousePanel } from "../WarehousePanel";
import { BuildingItem, BuildingNumberMap, Buildings, ResourceNumberMap } from "./BuildingDefinitions";
import { boostAdjacentBuilding, tickGeneral } from "./BuildingTicks";
import { MultipleRecipePanel, ResourceExplorerPanel } from "./MultipleRecipePanel";

export function TradeCenterDefinition(): BuildingItem {
    return {
        name: () => t("TradeCenter"),
        staticInput: {},
        staticOutput: {},
        power: 0,
        builtin: true,
        page: TradeCenterPage,
        tick: (v) => {
            forEach(D.autoSellRes, (r) => {
                if (!v.entity.resources.Cash) {
                    v.entity.resources.Cash = 0;
                }
                const sellAmount = -Math.min(getAutoSellAmountFor(r), getOrSet(v.entity.resources, r, 0));
                if (tryBuyOrSell(r, sellAmount)) {
                    T.next.io[r][0] += Math.abs(sellAmount);
                    v.isWorking = true;
                }
            });
        },
    };
}

export function WarehouseDefinition(): BuildingItem {
    return {
        name: () => t("Warehouse"),
        staticInput: {},
        staticOutput: {},
        panel: WarehousePanel,
        canBuildOnTile: () => true,
        power: -1,
        research: 2,
        desc: () => t("WarehouseBuildDesc"),
        tick: (visual) => {
            if (visual.entity.turnOff) {
                return;
            }
            const warehouse = validateWarehouse(visual.entity as WarehouseEntity);
            const powerUsage = -getPower(warehouse) * visual.cumulatedTicks;
            T.next.powerRequired += powerUsage;
            if (!tryDeductPower(powerUsage)) {
                visual.isWorking = false;
                visual.notEnoughPower = true;
                return;
            }
            visual.isWorking = true;
            visual.notEnoughPower = false;

            const totalCapacity = getWarehouseTotalCapacity(warehouse);
            // Source
            const totalSourceWeight = getWarehouseTotalWeight(warehouse.source);
            forEach(warehouse.source, (id, source) => {
                const from = D.buildings[source.xy];
                if (!from) {
                    delete warehouse.source[id];
                    return;
                }
                const requiredAmount = ((source.weight * totalCapacity) / totalSourceWeight) * visual.cumulatedTicks;
                const amount = Math.min(requiredAmount, from.resources[source.res]);
                if (amount > 0) {
                    visual.transport(from, warehouse, source.res, amount);
                }
            });

            // Target
            forEach(warehouse.target, (id, target) => {
                const to = D.buildings[target.xy];
                if (!to) {
                    delete warehouse.source[id];
                    return;
                }
                const requiredAmount =
                    getWarehouseTargetRealCapacity(warehouse, visual.cumulatedTicks, target) * visual.cumulatedTicks;
                const amount = Math.min(requiredAmount, warehouse.resources[target.res]);
                if (amount > 0) {
                    visual.transport(warehouse, to, target.res, amount);
                }
            });
        },
    };
}

export function ResourceExplorerDefinition(): BuildingItem {
    return {
        name: () => t("ResourceExplorer"),
        staticInput: {},
        staticOutput: {},
        power: -1,
        panel: ResourceExplorerPanel,
        canBuildOnTile: (xy) => !G.world.depositNodes[xy],
        cost: 5,
        research: 50,
        desc: () => t("ResourceExplorerDesc"),
        recipes: () => {
            const result: BuildingNumberMap = {
                IronMine: 1,
                LoggingCamp: 1,
                CoalMine: 1,
                AluminumMine: 1,
                SiliconMine: 1,
                CopperMine: 1,
                OilWell: 1,
                ChromiumMine: 1,
                TitaniumMine: 1,
                UraniumMine: 1,
                GasPump: 1,
                LithiumMine: 1,
                WaterPump: 1,
            };
            forEach(result, (k) => {
                if (!resourceExplorerCanExplore(k)) {
                    delete result[k];
                }
            });
            return result;
        },
    };
}

function resourceExplorerCanExplore(b: keyof Buildings) {
    const deposits = D.swissBoosts.resourceExplorerAllDeposits ? DEP : MAP[D.map].deposits;
    return keysOf(BLD[b].staticOutput).every((r) => deposits[r]);
}

export function PowerBankDefinition(): BuildingItem {
    return {
        name: () => t("PowerBank"),
        staticInput: {},
        staticOutput: {},
        power: 0,
        panel: PowerBankPanel,
        canBuildOnTile: () => true,
        desc: () => t("PowerBankBuildDesc"),
        buildOnTileWarning: (xy) => {
            if (!D.persisted.disableBuildWarningPowerBank && !isPowerBankWorking(stringToGrid(xy))) {
                return t("PowerBankNotWorking");
            }
            return null;
        },
        tick: (v) => {
            v.isWorking = isPowerBankWorking(stringToGrid(v.entity.grid));
        },
        research: 1,
    };
}

export function IndustryZoneDefinition(): BuildingItem {
    return {
        name: () => t("IndustryZone"),
        staticInput: {},
        staticOutput: {},
        power: 0,
        panel: IndustryZonePanel,
        canBuildOnTile: () => true,
        cost: 100,
        hideUpgradeMultiplier: true,
        research: 100,
        desc: () => t("IndustryZoneDesc"),
        tick: (v) => {
            T.next.powerRequired += v.getPowerUsage();
            const buildingTypes: Partial<Record<keyof Buildings, true>> = {};
            const buildings: string[] = [];
            G.grid.getAdjacent(stringToGrid(v.entity.grid)).forEach((g) => {
                const xy = gridToString(g);
                if (
                    D.buildings[xy] &&
                    D.buildings[xy].type !== "IndustryZone" &&
                    D.buildings[xy].level <= v.entity.level &&
                    !T.next.industryZone[xy]
                ) {
                    T.next.industryZone[xy] = true;
                    buildingTypes[getRecipe(D.buildings[xy])] = true;
                    buildings.push(xy);
                }
            });
            const uniqueBuildingTypes = keysOf(buildingTypes);
            if (uniqueBuildingTypes.length >= 2 && isSupplyChain(uniqueBuildingTypes)) {
                T.next.industryZone[v.entity.grid] = true;
                T.next.industryZonePermit += uniqueBuildingTypes.length - 2;
                // IZ itself
                T.next.industryZoneTier[v.entity.grid] = uniqueBuildingTypes.length;
                // Buildings within IZ
                let workingBuildings = 0;
                buildings.forEach((xy) => {
                    T.next.industryZoneTier[xy] = uniqueBuildingTypes.length;
                    if (G.world.getBuildingVisual(xy)?.isWorking) {
                        workingBuildings++;
                    }
                });
                if (workingBuildings === buildings.length && isPolicyActive("IndustryZoneProductivityBoost")) {
                    const amountToBoost = getIndustryZoneBoostAmount(v.entity);
                    buildings.forEach((xy) => {
                        const type = D.buildings[xy].type;
                        if (NoEfficiency[type]) {
                            return;
                        }
                        addBoostAmount(T.next.boosts, xy, type, [0, amountToBoost]);
                        addBoostAmount(T.next.boostsStable, xy, type, [0, amountToBoost]);
                    });
                }
                v.isWorking = true;
            } else {
                v.isWorking = false;
            }
        },
    };
}

export function ResourceBoosterDefinition(): BuildingItem {
    return {
        name: () => t("ResourceBooster"),
        staticInput: { Sci: 1 },
        staticOutput: {},
        power: -5,
        cost: 5,
        panel: ResourceBoosterPanel,
        canBuildOnTile: () => true,
        buildOnTileWarning: (xy) => {
            if (!D.persisted.disableBuildWarningResourceBooster && getBoostableBuildings(stringToGrid(xy)).length <= 0) {
                return t("ResourceBoosterNotWorking");
            }
            return null;
        },
        hideUpgradeMultiplier: true,
        desc: () => t("ResourceBoosterDesc"),
        research: 50,
        tick: (v) => {
            if (v.entity.turnOff) {
                return;
            }
            const powerUsage = v.getPowerUsage();
            v.notEnoughResources = !v.hasEnoughResources();
            v.notEnoughPower = !hasEnoughPower(powerUsage);
            T.next.powerRequired += powerUsage;
            // Tick "stable" amount regardless
            calculateResourceBooster(v.entity, true);
            // Tick "real" amount only if RB is working
            if (
                !v.notEnoughResources &&
                !v.notEnoughPower &&
                getBoostableBuildings(stringToGrid(v.entity.grid)).length > 0
            ) {
                v.isWorking = true;
                calculateResourceBooster(v.entity, false);
                assert(
                    tryDeductPower(powerUsage),
                    `Should always have enough power here! ${v.entity.type}, ${v.entity.grid}`
                );
                v.convertInputToOutput();
            }
        },
    };
}

export function DamDefinition(): BuildingItem {
    return {
        name: () => t("Dam"),
        staticInput: {},
        staticOutput: {},
        power: -5,
        dlc: DLC[1],
        available: () => MAP[D.map].deposits.Water > 0,
        canBuildOnTile: (xy) => {
            const deposit = G.world.depositNodes[xy];
            if ((deposit?.name as Deposit) === "Water" && !isFinite(deposit.getAttr("level"))) {
                return true;
            }
            return false;
        },
        tick: (v) => {
            const d = G.world.depositNodes[v.entity.grid];
            if (!d || (d.name as Deposit) !== "Water" || isFinite(d.getAttr<number>("level"))) {
                return;
            }
            const enoughPower = hasEnoughPower(v.getPowerUsage());
            v.isWorking = enoughPower && !v.entity.turnOff;
            G.grid.getAdjacent(stringToGrid(v.entity.grid)).forEach((a) => {
                const xy = gridToString(a);
                if (v.isWorking) {
                    const deposit = G.world.depositNodes[xy];
                    if (!deposit) {
                        const deposit = G.world.makeDeposit(xy, "Water");
                        deposit.attr({ xy: v.entity.grid, level: v.entity.level });
                        deposit.opacity = 0;
                        cc.tween(deposit).to(0.5, { opacity: 255 }, { easing: cc.easing.quadIn }).start();
                    } else {
                        const level = deposit.getAttr<number>("level");
                        // This is a natural deposit
                        if (!isFinite(level)) {
                            return;
                        }
                        if (level < v.entity.level) {
                            deposit.attr({ xy: v.entity.grid, level: v.entity.level });
                        }
                    }
                } else {
                    removeWaterTile(v.entity.grid, xy);
                }
            });
            if (D.map === "KansasCity") {
                boostAdjacentBuilding(v, getGenericBoostPercentage(v.entity), (e) => e.type === "Farmland");
            }
        },
        beforeRemove: (visual) => {
            G.grid.getAdjacent(stringToGrid(visual.entity.grid)).forEach((a) => {
                removeWaterTile(visual.entity.grid, gridToString(a));
            });
        },
        panel: () => {
            return {
                view: (vnode) => {
                    if (D.map !== "KansasCity") {
                        return null;
                    }
                    return m(
                        ".box.text-m.banner.blue",
                        t("KansasCityHydroDamBoost", {
                            boost: formatPercent(getGenericBoostPercentage(vnode.attrs.entity)),
                        })
                    );
                },
            };
        },
        research: 10,
        desc: () => t("DamDesc"),
    };
}

function removeWaterTile(damXy: string, waterXy: string) {
    const deposit = G.world.depositNodes[waterXy];
    if (deposit && deposit?.getAttr("xy") === damXy) {
        delete G.world.depositNodes[waterXy];
        cc.tween(deposit)
            .to(0.5, { opacity: 0 }, { easing: cc.easing.quadIn })
            .call(() => deposit.destroy())
            .start();
    }
}

export function FarmlandDefinition(): BuildingItem {
    return {
        name: () => t("Farmland"),
        staticInput: {},
        staticOutput: {},
        power: 0,
        dlc: DLC[1],
        hideProfit: true,
        available: () => MAP[D.map].deposits.Water > 0,
        canBuildOnTile: (xy) => {
            return (G.world.depositNodes[xy]?.name as Deposit) === "Water";
        },
        desc: () => t("FarmlandDesc"),
        recipes: () => {
            const result: BuildingNumberMap = {};
            forEach(getAvailableCrops(), (crop) => {
                result["_" + crop] = 1;
            });
            if (CC_DEBUG || isOctober()) {
                result._Pmpk = 1;
            }
            return result;
        },
        // output: (entity) => {
        //     const f = entity as FarmlandEntity;
        //     if (
        //         BLD[entity.type]?.canBuildOnTile?.(entity.grid) &&
        //         (isFarmlandAlwaysWork() || T.tickCount % 10 < 5) &&
        //         !isBuildingLevelTooHigh(entity)
        //     ) {
        //         let amount = 1;
        //         if (D.map === "KansasCity" && f.outputResource === "Corn") {
        //             amount = 2;
        //         }
        //         if (isPolicyActive("CropOutputx2")) {
        //             amount *= 2;
        //         }
        //         return { [f.outputResource]: amount };
        //     }
        //     return { [f.outputResource]: 0 };
        // },
        tick: (v) => {
            tickGeneral(v);
            if (isPolicyActive("HydroFarming")) {
                addBoostAmount(T.next.boosts, v.entity.grid, v.entity.type, [
                    0.2 * (T.workingBuildingCount?.Dam ?? 0),
                    0.2 * (T.workingBuildingCount?.Dam ?? 0),
                ]);
                addBoostAmount(T.next.boostsStable, v.entity.grid, v.entity.type, [
                    0.2 * (T.buildingCount?.Dam ?? 0),
                    0.2 * (T.buildingCount?.Dam ?? 0),
                ]);
            }
        },
        tickOfflineEarning: (entity, ticks) => {
            const f = entity as FarmlandEntity;
            const actualTicks = isFarmlandAlwaysWork() ? ticks : ticks / 2;
            if (actualTicks <= 1 || !isStableWaterTile(entity.grid)) {
                return {};
            }
            const amount = getOfflineOutputAmount(entity) * actualTicks;
            const result: ResourceNumberMap = {};
            forEach(getOutput(entity), (res) => {
                addResourceTo(entity, res, amount, true);
                result[res] = amount;
            });
            return result;
        },
        panel: FarmlandPanel,
        research: 5,
    };
}

export function GreenhouseDefinition(): BuildingItem {
    return {
        name: () => t("Greenhouse"),
        staticInput: { Water: 1 },
        staticOutput: {},
        power: -2,
        dlc: DLC[1],
        desc: () => t("GreenhouseDesc"),
        panel: MultipleRecipePanel,
        research: 5,
        recipes: () => {
            const result: BuildingNumberMap = {};
            forEach(getAvailableCrops(), (crop) => {
                result["_Water_" + crop] = 1;
            });
            if (CC_DEBUG || isOctober()) {
                result._Water_Pmpk = 1;
            }
            return result;
        },
        tick: (v) => {
            ensureRecipe(v.entity);
            tickGeneral(v);
            if (isPolicyActive("HydroFarming")) {
                addBoostAmount(T.next.boosts, v.entity.grid, v.entity.type, [
                    0.2 * (T.workingBuildingCount?.Dam ?? 0),
                    0.2 * (T.workingBuildingCount?.Dam ?? 0),
                ]);
                addBoostAmount(T.next.boostsStable, v.entity.grid, v.entity.type, [
                    0.2 * (T.buildingCount?.Dam ?? 0),
                    0.2 * (T.buildingCount?.Dam ?? 0),
                ]);
            }
        },
    };
}

export function FlourMillDefinition(): BuildingItem {
    return {
        name: () => t("FlourMill"),
        staticInput: { Corn: 2, Wheat: 2 },
        staticOutput: { Flour: 2 },
        power: -4,
        dlc: DLC[1],
        panel: () => {
            return {
                view: (vnode) => {
                    const entity = vnode.attrs.entity as FlourMillEntity;
                    return m(".box", [
                        m(".title.two-col", [
                            m("div", t("FlourMillAdjustMix")),
                            m(
                                ".blue.pointer",
                                {
                                    onclick: () => {
                                        G.audio.playClick();
                                        batchApply(entity, (e: FlourMillEntity) => {
                                            e.ratio = entity.ratio;
                                        });
                                    },
                                },
                                t("ApplyToBatch", { batch: batchModeLabel() })
                            ),
                        ]),
                        m(".hr"),
                        m("input.block", {
                            type: "range",
                            min: 0,
                            max: 10,
                            step: 1,
                            oninput: (e) => {
                                entity.ratio = e.target.value / 10;
                            },
                            value: entity.ratio * 10,
                        }),
                        m(".sep5"),
                        m(".row.text-m.text-desc", [
                            m("div", RES.Corn.name()),
                            m(".f1"),
                            m("div", isPolicyActive("RiceFlour") ? RES.Rice.name() : RES.Wheat.name()),
                        ]),
                    ]);
                },
            };
        },
        input: (_entity) => {
            const entity = _entity as FlourMillEntity;
            if (!hasValue(entity.ratio)) {
                entity.ratio = 0.5;
            }
            entity.ratio = cc.misc.clampf(entity.ratio, 0, 1);
            const result: ResourceNumberMap = {
                Corn: 4 * entity.ratio,
            };
            const r = 4 * (1 - entity.ratio);
            isPolicyActive("RiceFlour") ? (result.Rice = r) : (result.Wheat = r);
            return result;
        },
    };
}
export function DefenseCommandDefinition(): BuildingItem {
    return {
        name: () => t("DefenseCommand"),
        staticInput: {},
        staticOutput: {},
        power: -10,
        input: (entity: DefenseCommandEntity) => {
            return { [entity.inputResource]: 1 / 10 };
        },
        output: (entity: DefenseCommandEntity) => {
            return { Dmg: D.price[entity.inputResource].price / 10 };
        },
        panel: DefenseCommandPanel,
        canAttack: true,
        dlc: DLC[1],
        available: () => D.map === "Istanbul",
        canBuildOnTile: () => G.world.waveManager.wormholes.length > 0,
        desc: () => t("DefenseCommandDesc"),
    };
}
