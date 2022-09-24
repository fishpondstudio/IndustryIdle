import { D, G, hasDLC, Languages, ORIGINAL_GAMEDATA } from "../General/GameData";
import { CountryCode, forEach, hasValue, keysOf, sizeOf } from "../General/Helper";
import { Buildings, ResourceNumberMap, ResourceSet } from "./Buildings/BuildingDefinitions";
import { COLORS } from "./ColorThemes";
import { Entity, makeEntity, WarehouseEntity } from "./Logic/Entity";
import {
    addCash,
    BLD,
    canBuild,
    canPrice,
    CROP,
    DEP,
    ensureRecipe,
    getBuildingsThatConsumes,
    getBuildingsThatProduces,
    getCostForBuilding,
    isAvailable,
    MAP,
    POLICY,
    refundCash,
    RES,
    runAllTests,
} from "./Logic/Logic";
import { generateRandomIsland, Maps } from "./MapDefinitions";
import { Resources } from "./ResourceDefinitions";

export function runMigration() {
    if (D.map === "RandomIsland") {
        generateRandomIsland();
    }
    // Add built-in buildings
    const mid = Math.ceil(MAP[D.map].size / 2);
    G.swissShop = addBuilding(`${mid - 4},${mid}`, "SwissShop", {}, true);
    G.wholesaleCenter = addBuilding(`${mid - 3},${mid}`, "WholesaleCenter", {}, true);
    G.centralBank = addBuilding(`${mid - 2},${mid}`, "CentralBank", {}, true);
    G.researchLab = addBuilding(
        `${mid - 1},${mid}`,
        "ResearchLab",
        {
            RP: 1000,
        },
        true
    );
    G.headquarter = addBuilding(`${mid},${mid}`, "Headquarter", {}, true);
    G.tradeCenter = addBuilding(
        `${mid + 1},${mid}`,
        "TradeCenter",
        {
            Cash: 5e6,
        },
        true
    );
    G.statBureau = addBuilding(`${mid + 2},${mid}`, "StatisticsCenter", {}, true);
    G.policyCenter = addBuilding(
        `${mid + 3},${mid}`,
        "PolicyCenter",
        {
            PP: 1000,
        },
        true
    );
    G.logisticsDept = addBuilding(`${mid + 4},${mid}`, "LogisticsDepartment", {}, true);

    Object.keys(ORIGINAL_GAMEDATA.buildings).forEach((k) => {
        const o = ORIGINAL_GAMEDATA.buildings[k];
        const b = D.buildings[k];
        if (!b || b.type !== o.type) {
            D.buildings[k] = ORIGINAL_GAMEDATA.buildings[k];
        }
    });
    if (!COLORS[D.persisted.colorTheme]) {
        D.persisted.colorTheme = ORIGINAL_GAMEDATA.persisted.colorTheme;
    }

    ////////// Buildings //////////
    forEach(D.buildings, (k, v) => {
        v.grid = k;
        if (!BLD[v.type] || !isAvailable(BLD[v.type])) {
            delete D.buildings[k];
            return;
        }
        if (D.buildingsToConstruct[k]) {
            delete D.buildingsToConstruct[k];
        }
        if (v.construction) {
            delete D.buildings[k];
            D.buildingsToConstruct[k] = v;
        }
        keysOf(v.resources).forEach((r) => {
            if (!RES[r]) {
                delete v.resources[r];
            }
        });
        if (v.type === "Warehouse") {
            const warehouse = v as WarehouseEntity;
            if (!warehouse.source) {
                warehouse.source = {};
            }
            if (!warehouse.target) {
                warehouse.target = {};
            }
            forEach(warehouse.source, (k, s) => {
                if (!s.weight) {
                    s.weight = 1;
                }
            });
        }
        ensureRecipe(v);
        if (!v.highPriority) {
            v.highPriority = false;
        }
        if (!v.inputOverride) {
            v.inputOverride = {};
        }
        if (!v.inputOverrideFallback) {
            v.inputOverrideFallback = "skip";
        }
        if (!v.inputBuffer) {
            v.inputBuffer = "auto";
        }
        if (!v.inputCapacityOverride) {
            v.inputCapacityOverride = "x1";
        }
        // @ts-expect-error
        if (v.alwaysInput) {
            v.inputBuffer = "stockpile";
            // @ts-expect-error
            delete v.alwaysInput;
        }
    });

    ////////// Constructions //////////
    forEach(D.buildingsToConstruct, (k, v) => {
        if (!v.construction) {
            delete D.buildingsToConstruct[k];
        }
        // @ts-expect-error paused status is no longer in use
        if (v.construction === "paused") {
            refundCash(getCostForBuilding(v.type, 1));
            v.construction = "unpaid";
        }
    });

    ////////// Auto Sell //////////
    forEach(D.autoSellRes, (k) => {
        if (!RES[k]) {
            delete D.autoSellRes[k];
        }
    });

    ////////// Price //////////
    keysOf(D.price).forEach((k) => {
        if (!RES[k]) {
            delete D.price[k];
        }
    });
    keysOf(RES).some((k) => {
        if (!isFinite(D.price[k]?.price) || !isFinite(D.price[k]?.elasticity)) {
            D.lastPricedAt = 0;
            return true;
        }
        return false;
    });
    if (cc.js.isEmptyObject(D.marketNews)) {
        D.lastPricedAt = 0;
    }

    ////////// Policy //////////
    forEach(POLICY, (k, v) => {
        if (!D.policies[k]) {
            D.policies[k] = { active: false };
        }
    });
    forEach(D.policies, (k, v) => {
        if (!POLICY[k]) {
            delete D.policies[k];
        }
    });

    ////////// Game Data //////////
    forEach(D, (k, v) => {
        if (ORIGINAL_GAMEDATA[k] === undefined) {
            delete D[k];
        }
    });
    if (!hasValue(MAP[D.map])) {
        D.map = ORIGINAL_GAMEDATA.map;
    }

    ////////// Unlock Buildings //////////
    forEach(BLD, (k, v) => {
        if (!canBuild(k)) {
            return;
        }
        if (cc.js.isEmptyObject(v.staticInput) && !BLD[k].research) {
            D.unlockedBuildings[k] = true;
        }
    });

    forEach(D.unlockedBuildings, (b, v) => {
        if (!BLD[b] || !isAvailable(BLD[b]) || !hasDLC(BLD[b].dlc)) {
            delete D.unlockedBuildings[b];
            return;
        }
    });

    ////////// Languages //////////
    if (!Languages[D.persisted.language]) {
        D.persisted.language = ORIGINAL_GAMEDATA.persisted.language;
    }
    if (!CountryCode[D.persisted.flag.toUpperCase()]) {
        D.persisted.flag = "earth";
    }

    ////////// Building Tiers //////////
    let resources: ResourceSet = { ...DEP, ...CROP };
    let tier = 1;
    // eslint-disable-next-line no-constant-condition
    let iter = 0;
    while (true) {
        const buildings = getBuildingsThatConsumes(resources);
        resources = {};
        if (sizeOf(buildings) <= 0) {
            break;
        }
        if (++iter > 99999) {
            cc.warn("Resource deadlock detected:", resources, buildings, G.buildingTiers);
            break;
        }
        forEach(buildings, (b) => {
            G.buildingTiers[b] = tier;
            forEach(BLD[b].staticOutput, (k) => {
                if (canPrice(k)) {
                    resources[k] = true;
                }
            });
        });
        tier++;
    }
    forEach(BLD, (b, v) => {
        if (sizeOf(v.staticInput) === 0 && sizeOf(v.staticOutput) > 0) {
            if (G.buildingTiers[b]) {
                cc.warn(`Override building tiers for ${b}: Old = ${G.buildingTiers[b]}, New = 0`);
            }
            G.buildingTiers[b] = 0;
        }
        if (v.power >= 0) {
            G.buildingTiers[b] = 0;
        }
    });
    ////////// Resource Tiers //////////
    forEach(RES, (res) => {
        let tier = canPrice(res) ? Infinity : 0;
        forEach(getBuildingsThatProduces({ [res]: true }), (b) => {
            if (G.buildingTiers[b] < tier) {
                tier = G.buildingTiers[b];
            }
        });
        G.resourceTiers[res] = tier;
    });
    ////////// Crowdfunding //////////
    forEach(D.crowdfunding, (id, v) => {
        if (parseInt(id, 10) < 10000 || v.resources.some((r) => !canPrice(r.resource))) {
            addCash(v.value);
            delete D.crowdfunding[id];
        }
    });
    if (!D.crowdfunding[D.lastCrowdfundingAt]) {
        D.lastCrowdfundingAt = 0;
    }
    ////////// Version specific - might be removed later //////////
    // console.log(
    //     JSON.stringify(
    //         keysOf(BLD).filter(
    //             (k) =>
    //                 !BLD[k].dlc &&
    //                 !BLD[k].available &&
    //                 keysOf(BLD[k].input).length > 0 &&
    //                 keysOf(BLD[k].output).length > 0 &&
    //                 BLD[k].power < 0
    //         )
    //     )
    // );
    if (CC_DEBUG) {
        runAllTests();
        verifyBuildingDefinitions();
    }
}

export function addBuilding(
    xy: string,
    type: keyof Buildings,
    resources: ResourceNumberMap = {},
    singleton = false
): Entity {
    if (singleton) {
        forEach(D.buildings, (k, entity) => {
            if (entity.type === type && k !== xy) {
                D.buildings[xy] = entity;
                entity.grid = xy;
                delete D.buildings[k];
            }
        });
    }
    const oldEntity = D.buildings[xy];
    if (!oldEntity || oldEntity.type !== type) {
        D.buildings[xy] = makeEntity(xy, type, resources);
    }
    return D.buildings[xy];
}

function verifyBuildingDefinitions() {
    var produceAllCrops = D.swissBoosts.produceAllCrops;
    D.swissBoosts.produceAllCrops = true;
    forEach(BLD, (k, v) => {
        if (v.available?.() && k.startsWith("_")) {
            cc.error(`${k} is hidden but available() returns true!`);
        }
        if (v.recipes) {
            const recipes = v.recipes();
            forEach(recipes, (r) => {
                if (!BLD[r]) {
                    console.error(`Building ${k}'s recipe ${r} does not exists! Check BuildingDefinitions!`);
                }
            });
        }
    });
    D.swissBoosts.produceAllCrops = produceAllCrops;
    forEach(MAP, (name, map) => {
        if (sizeOf(map.crops) > 0) {
            forEach(RES, (res) => {
                if (!canPrice(res) || CROP[res] || DEP[res]) {
                    return;
                }
                if (!canProduce(res, name)) {
                    const buildings = keysOf(getBuildingsThatProduces({ [res]: true })).filter(
                        (b) => !b.startsWith("_")
                    );
                    if (buildings.length > 0) {
                        cc.log(`%c>> ${name} cannot produce ${res} (${buildings}):`, "font-weight:bold;");
                        canProduce(res, name, cc);
                        cc.log(">>>>>>>>>>>>>>>>>>>>");
                    }
                }
            });
        }
    });
}

interface MissingCropResult {
    resources: (keyof Resources)[];
    building: keyof Buildings;
}

function canProduce(
    res: keyof Resources,
    map: keyof Maps,
    console: {
        log: (k: string) => void;
        warn: (k: string) => void;
    } = null
): boolean {
    const buildings = keysOf(getBuildingsThatProduces({ [res]: true }));
    return buildings.some((b) => {
        const recipe = keysOf(BLD[b].staticInput);
        const can = recipe.every((res) => {
            if (DEP[res]) {
                return true;
            }
            if (CROP[res]) {
                const hasCrop = MAP[map].crops[res];
                if (!hasCrop && console) {
                    const log = `>> Recipe ${b} (${recipe} -> ${keysOf(BLD[b].staticOutput)}) missing <${res}>`;
                    if (b.startsWith("_")) {
                        console.log(log);
                    } else {
                        console.warn(log);
                    }
                }
                return hasCrop;
            }
            return canProduce(res, map, console);
        });
        return can;
    });
}
