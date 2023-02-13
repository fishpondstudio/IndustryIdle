import { buildingHasColor, getBuildingColor, resetBuildingColor, setBuildingColor } from "../CoreGame/ColorThemes";
import { stringToGrid } from "../CoreGame/GridHelper";
import { batchApply, batchModeLabel, doBatchDowngrade, doBatchSell, doBatchSellEstimate, doBatchUpgrade, getBatchDowngradeEstimate, getBatchUpgradeEstimate } from "../CoreGame/Logic/BatchMode";
import { getInput, getOutput, InputBufferTypes, InputCapacityOverrideTypes } from "../CoreGame/Logic/Entity";
import {
    BLD,
    buildingCanInput,
    buildingCanOutput,
    buildingValue,
    canPlaceOnTile,
    getBuildingCount,
    getBuildingPermit,
    getBuildingPermitCost,
    getCash,
    getCostForBuilding,
    getSellRefundPercentage,
    getUpgradeCost,
    isMineCorrectlyPlaced,
    levelToNextMultiplier,
    profitMargin,
    refundCash,
    refundForSellingBuilding,
    RES,
    trySpendCash,
} from "../CoreGame/Logic/Logic";
import { getOfflineProductionSecond, qualifyForOfflineProduction } from "../CoreGame/Logic/OfflineProduction";
import {
    canApplyProductionMultiplier,
    getAdjacentBonus,
    getAdjacentCount,
    getBoostAmount,
    getIndustryZoneMultiplier,
    getMapProductionMultiplier,
    getOutputAmount,
    getPower,
    getPowerPlantScienceProduction,
    getSwissMultiplier,
    getTileModifier,
    getUpgradeMultiplier,
    NoAdjacentBonus,
} from "../CoreGame/Logic/Production";
import { isPolicyActive } from "../CoreGame/Logic/SelfContained";
import { allAffectingNews } from "../CoreGame/MarketNews";
import { Resources } from "../CoreGame/ResourceDefinitions";
import { getTips, nextTips } from "../CoreGame/Tips";
import { D, DLC, G, hasDLC, T } from "../General/GameData";
import { formatHMS, formatPercent, getOrSet, ifTrue, keysOf, nf, numberSign, SECOND, sizeOf } from "../General/Helper";
import { t } from "../General/i18n";
import { BuildingInputPanel } from "./BuildingInputPanel";
import { CrazyGameAdBanner } from "./CrazyGameAdBanner";
import { MoveBuildingPanel } from "./MoveBuildingPanel";
import { shortcut } from "./Shortcut";
import { iconB, InputOverrideFallbackOptions, leftOrRight, uiBoxToggle, uiHeaderRoute } from "./UIHelper";
import { hideAlert, routeTo, showAlert, showToast } from "./UISystem";

let showAllModifiers = false;
let showProfitBreakdown = false;
let showProductionMultiplierBreakdown = false;
export function InspectPage(): m.Comp<{ xy: string }> {
    return {
        oninit: () => {
            nextTips();
        },
        view: (vnode) => {
            const xy = vnode.attrs.xy;
            const entity = D.buildings[xy];
            if (!entity) {
                return null;
            }
            const grid = stringToGrid(xy);
            const building = BLD[entity.type];
            const visual = G.world.getBuildingVisual(xy);
            if (!visual) {
                cc.error(`Building ${entity.type} (${entity.grid}) does not have a visual!`);
                return null;
            }
            if (building.page) {
                return m(building.page, { entity, docked: false });
            }

            const notEnoughPower = visual.notEnoughPower;
            const boostAmount = getBoostAmount(T.current.boosts, entity.grid, entity.type);

            function renderOutput() {
                const output = getOutput(entity);
                if (sizeOf(output) <= 0) {
                    return null;
                }
                return [
                    m(".hr"),
                    m(".title.two-col", [
                        m("div", t("OutputCapacity")),
                        m(
                            "div",
                            ifTrue(boostAmount[1] > 0, () => [
                                m(
                                    ".text-s.text-desc.green",
                                    {
                                        title: t("ResourceBoosterPercentageV2", {
                                            percent: formatPercent(boostAmount[1]),
                                        }),
                                    },
                                    `+${formatPercent(boostAmount[1])}`
                                ),
                            ])
                        ),
                    ]),
                    keysOf(output).map((r) => {
                        return [
                            m(".hr"),
                            m(
                                ".two-col.pointer",
                                {
                                    onclick: () => G.world.highlightBuildings((v) => getInput(v.entity)[r] > 0),
                                },
                                [
                                    m("div", [
                                        m("div", RES[r].name()),
                                        m(
                                            ".text-s.text-desc",
                                            t("HighlightInput", {
                                                type: RES[r].name(),
                                            })
                                        ),
                                    ]),
                                    m("div", m("div", nf(getOutputAmount(entity, r) * entity.tickSec))),
                                ]
                            ),
                        ];
                    }),
                ];
            }

            let depositNode = [];

            const deposit = G.world.depositNodes[xy];
            if (deposit) {
                const d = deposit.name as keyof Resources;
                depositNode = [
                    m(".hr"),
                    m(".title", t("ResourceDeposit")),
                    m(".hr"),
                    m(".two-col", [m("div", m("div", RES[d].name())), m(".green.text-m", t("Unlimited"))]),
                ];
            }
            const power = getPower(entity);
            const bv = buildingValue(entity);
            const canInput = buildingCanInput(entity);
            const canOutput = buildingCanOutput(entity);
            const maxTile = getOrSet(entity, "maxTile", 0);
            const scienceFromPower = getPowerPlantScienceProduction(entity);
            const tileModifier = getTileModifier(entity.grid, entity.type);
            const downgradeRefund = () =>
                Math.min(D.cashSpent, getCostForBuilding(entity.type, entity.level) * getSellRefundPercentage());
            const sellRefund = () => Math.min(D.cashSpent, getSellRefundPercentage() * bv);
            const adjacentBonus = getAdjacentCount(xy) * getAdjacentBonus() * 100;
            const eAdjacentBonus = getAdjacentBonus();
            const pm = profitMargin(visual);
            const profit = pm.price - pm.cost - pm.fuel;
            const newsCount = allAffectingNews(entity.type).length;
            const mapProductionMultiplier = getMapProductionMultiplier();
            const industryZoneMultiplier = getIndustryZoneMultiplier(entity);
            const totalProductionMultiplier = getSwissMultiplier() + mapProductionMultiplier + industryZoneMultiplier;
            return m(".modal", { class: leftOrRight() }, [
                uiHeaderRoute(building.name(), "/main"),
                m(".scrollable", [
                    m(CrazyGameAdBanner),
                    m(
                        ".box.banner.text-m",
                        {
                            style: {
                                display: isMineCorrectlyPlaced(entity) ? "none" : "block",
                            },
                        },
                        t("MisplacedBuilding", { building: building.name() })
                    ),
                    getTips(),
                    ifTrue(visual.notEnoughPermit, () => {
                        const deficit = getBuildingCount() - getBuildingPermit();
                        const getCost = () => getBuildingPermitCost(deficit);
                        const cost = getCost();
                        return m(".box", [
                            m(".two-col", [
                                m("div", [
                                    m(".red", t("BuildingPermitsNeeded")),
                                    m(".text-s.text-desc", t("BuildingPermitsNeededDesc")),
                                ]),
                                m(".red", nf(deficit)),
                            ]),
                            m(
                                ".action",
                                {
                                    class: getCash() > cost ? "" : "disabled",
                                },
                                m(
                                    ".two-col",
                                    {
                                        onclick: () => {
                                            if (trySpendCash(getCost())) {
                                                G.audio.playClick();
                                                D.buildingPermit += deficit;
                                                visual.notEnoughPermit = false;
                                            } else {
                                                showToast(t("NotEnoughCash"));
                                                G.audio.playError();
                                            }
                                        },
                                    },
                                    [m("div", t("BuyMissingPermits")), m("div", `$${nf(cost)}`)]
                                )
                            ),
                        ]);
                    }),
                    m(".box", [
                        m(
                            ".two-col",
                            {
                                onclick: () => {
                                    if (CC_DEBUG) {
                                        cc.log(entity);
                                    }
                                },
                            },
                            [m("div", t("Level")), m("div", entity.level)]
                        ),
                        ifTrue(!building.hideUpgradeMultiplier, () => [
                            m(".hr"),
                            m(".two-col", [
                                m("div", [m("div", t("Multiplier")), m(".text-s.text-desc", t("MultiplierDesc"))]),
                                m("div", `x${getUpgradeMultiplier(entity)}`),
                            ]),
                        ]),
                        ifTrue(canApplyProductionMultiplier(entity), () => {
                            return [
                                m(".hr"),
                                m(
                                    ".two-col.pointer",
                                    {
                                        onclick: () => {
                                            showProductionMultiplierBreakdown = !showProductionMultiplierBreakdown;
                                        },
                                    },
                                    [
                                        m("div", [
                                            m("div", t("ProductionMultipliers")),
                                            m(
                                                ".text-s.blue",
                                                showProductionMultiplierBreakdown
                                                    ? t("HideBreakdown")
                                                    : t("ShowBreakdown")
                                            ),
                                        ]),
                                        m("div", `x${totalProductionMultiplier}`),
                                    ]
                                ),
                                ifTrue(showProductionMultiplierBreakdown, () => [
                                    m(".hr.dashed.condensed"),
                                    m(".two-col.text-s", [m("div", t("BaseProductionMultiplier")), m("div", "+1")]),
                                    m(".hr.dashed.condensed"),
                                    m(".two-col.text-s", [
                                        m("div", t("MultiplierSwissUpgrade")),
                                        m("div", `+${nf(D.persisted.productionMultiplier - 1)}`),
                                    ]),
                                    m(".hr.dashed.condensed"),
                                    m(".two-col.text-s", [
                                        m("div", t("MultiplierSwissBoost")),
                                        m("div", `+${nf(D.swissBoosts.productionMultiplier - 1)}`),
                                    ]),
                                    ifTrue(mapProductionMultiplier > 0, () => [
                                        m(".hr.dashed.condensed"),
                                        m(".two-col.text-s", [
                                            m("div", t("MultiplierMapUniqueBonus")),
                                            m("div", `+${nf(mapProductionMultiplier)}`),
                                        ]),
                                    ]),
                                    ifTrue(industryZoneMultiplier > 0, () => [
                                        m(".hr.dashed.condensed"),
                                        m(".two-col.text-s", [
                                            m("div", t("IndustryZoneMultiplierDesc")),
                                            m("div", `+${nf(industryZoneMultiplier)}`),
                                        ]),
                                    ]),
                                ]),
                            ];
                        }),
                        m(".hr"),
                        m(
                            ".two-col.pointer",
                            {
                                onclick: () => {
                                    showAllModifiers = !showAllModifiers;
                                },
                            },
                            [
                                m("div", [
                                    m("div", t("TileModifier")),
                                    m(".text-s.blue", showAllModifiers ? t("HideAllModifiers") : t("ShowAllModifiers")),
                                ]),
                                m(
                                    "div",
                                    {
                                        class: tileModifier >= 0 ? "green" : "red",
                                    },
                                    [numberSign(tileModifier), formatPercent(Math.abs(tileModifier))]
                                ),
                            ]
                        ),
                        ifTrue(showAllModifiers, () =>
                            keysOf(D.unlockedBuildings)
                                .filter((b) => canPlaceOnTile(b, xy) && hasDLC(BLD[b].dlc))
                                .sort((a, b) => getTileModifier(xy, b) - getTileModifier(xy, a))
                                .map((b) => {
                                    const modifier = getTileModifier(xy, b);
                                    return [
                                        m(".hr.dashed.condensed"),
                                        m(".two-col.text-s.text-desc", [
                                            m("div", BLD[b].name()),
                                            m(
                                                "div",
                                                {
                                                    class: modifier >= 0 ? "green" : "red",
                                                },
                                                formatPercent(modifier)
                                            ),
                                        ]),
                                    ];
                                })
                        ),
                        ifTrue(building.power !== 0, () => [
                            m(".hr"),
                            m(".row", [
                                m(".f1", building.power > 0 ? t("PowerSupply") : t("PowerUsage")),
                                ifTrue(notEnoughPower, () =>
                                    iconB("power_off", 16, 5, { marginLeft: "10px" }, { class: "red" })
                                ),
                                m(
                                    "div",
                                    { class: power > 0 ? "green" : "red" },
                                    `${nf(power * entity.tickSec, true)}W`
                                ),
                            ]),
                        ]),
                        ifTrue(building.power > 0, () => [
                            m(".hr"),
                            m(".two-col", [
                                m("div", [m("div", t("Science")), m(".text-s.text-desc", t("ScienceFromPowerDesc"))]),
                                m(
                                    ".ml20",
                                    {
                                        class: scienceFromPower > 0 ? "green" : "red",
                                    },
                                    t("PerSecond", {
                                        time: nf(scienceFromPower),
                                    })
                                ),
                            ]),
                        ]),
                        ifTrue(!building.hideProfit && pm.price > 0, () => [
                            m(".hr"),
                            m(
                                ".row.pointer",
                                {
                                    onclick: () => {
                                        showProfitBreakdown = !showProfitBreakdown;
                                    },
                                },
                                [
                                    m(".f1", [
                                        m("div", t("BuildingProfit")+" ("+t("AutoSell")+")"),
                                        m(
                                            ".text-s.blue",
                                            showProfitBreakdown ? t("HideBreakdown") : t("ShowBreakdown")
                                        ),
                                    ]),
                                    m(".text-right", [
                                        m(
                                            "div",
                                            {
                                                class: visual.isWorking ? (profit > 0 ? "green" : "red") : "text-desc",
                                            },
                                            t("PerSecond", {
                                                time: numberSign(profit) + nf(Math.abs(profit)),
                                            })
                                        ),
                                        ifTrue(pm.margin < Infinity, () =>
                                            m(".text-s.text-desc", formatPercent(pm.margin))
                                        ),
                                    ]),
                                ]
                            ),
                            ifTrue(showProfitBreakdown, () => [
                                pm.output.map((p) => [
                                    m(".hr.dashed.condensed"),
                                    m(".two-col.text-s.text-desc", [
                                        m(
                                            "div",
                                            t("ProfitBreakdownOutput", {
                                                res: RES[p.res].name(),
                                            })
                                        ),
                                        m(".green", "$" + nf(p.value)),
                                    ]),
                                ]),
                                pm.input.map((p) => [
                                    m(".hr.dashed.condensed"),
                                    m(".two-col.text-s.text-desc", [
                                        m(
                                            "div",
                                            t("ProfitBreakdownInput", {
                                                res: RES[p.res].name(),
                                            })
                                        ),
                                        m(".red", "-$" + nf(p.value)),
                                    ]),
                                ]),
                                m(".hr.dashed.condensed"),
                                m(".two-col.text-s.text-desc", [
                                    m("div", t("ProfitBreakdownFuel")),
                                    m(".red", "-$" + nf(pm.fuel)),
                                ]),
                            ]),
                        ]),
                        [1, 5, levelToNextMultiplier(entity)].map((n, index) => {
                            const getBuildingUpgradeCost = () =>
                                getUpgradeCost(entity.level, n, (l) => getCostForBuilding(entity.type, l));
                            const upgradeCost = getBuildingUpgradeCost();
                            const shortcutKey = index + 1;
                            return [
                                m(".hr"),
                                m(
                                    ".two-col.pointer",
                                    {
                                        class: getCash() >= upgradeCost ? "blue" : "text-desc",
                                        "data-shortcut": shortcutKey,
                                        onclick: () => {
                                            if (trySpendCash(getBuildingUpgradeCost())) {
                                                entity.level += n;
                                                G.audio.playClick();
                                            } else {
                                                showToast(t("NotEnoughCash"));
                                                G.audio.playError();
                                            }
                                        },
                                    },
                                    [
                                        m("div", `${shortcut(shortcutKey, "", " ")}${t("Upgrade")} x${n}`),
                                        m(".ml20", `$${nf(upgradeCost)}`),
                                    ]
                                ),
                            ];
                        }),
                        ifTrue(newsCount > 0, () => [
                            m(".hr"),
                            m(
                                ".banner.blue.pointer.text-m.two-col",
                                { onclick: () => G.world.routeTo(G.wholesaleCenter.grid) },
                                [
                                    m(
                                        "div",
                                        t("MarketNewsBuilding", {
                                            num: newsCount,
                                        })
                                    ),
                                    iconB("rss_feed", 24, 0, {
                                        margin: "-10px 0 -10px 10px",
                                    }),
                                ]
                            ),
                        ]),
                        depositNode,
                        m(BuildingInputPanel, { entity, boostAmount, visual }),
                        renderOutput(),
                    ]),
                    building.panel ? m(building.panel, { entity: entity }) : null,
                    m(".box", [
                        m(".two-col.text-s.uppercase", [
                            m("div", t("BatchMode")),
                            m("div", [
                                m(
                                    "span.pointer",
                                    {
                                        class: D.persisted.batchMode === "all" ? "blue" : "text-desc",
                                        onclick: () => {
                                            D.persisted.batchMode = "all";
                                            G.audio.playClick();
                                            G.world.playerInput.highlightOnSelect(entity.grid);
                                        },
                                    },
                                    t("BatchModeAll")
                                ),
                                m(
                                    "span.ml20.pointer",
                                    {
                                        class: D.persisted.batchMode === "cluster" ? "blue" : "text-desc",
                                        onclick: () => {
                                            D.persisted.batchMode = "cluster";
                                            G.audio.playClick();
                                            G.world.playerInput.highlightOnSelect(entity.grid);
                                        },
                                    },
                                    t("BatchModeCluster")
                                ),
                                m(
                                    "span.ml20.pointer",
                                    {
                                        class: D.persisted.batchMode === "adjacent" ? "blue" : "text-desc",
                                        onclick: () => {
                                            D.persisted.batchMode = "adjacent";
                                            G.audio.playClick();
                                            G.world.playerInput.highlightOnSelect(entity.grid);
                                        },
                                    },
                                    t("BatchModeAdjacent")
                                ),
                            ]),
                        ]),
                        m(".hr"),
                        m(
                            ".pointer.blue.two-col",
                            {
                                onclick: () => {
                                    const { cost, count } = getBatchUpgradeEstimate(entity, entity.level);
                                    showAlert(
                                        `${t("Upgrade")} ${batchModeLabel()} ${t("BatchUpgradeToLevelX", {
                                            level: entity.level,
                                        })}`,
                                        t("BatchOperationDesc", { number: count, cost: nf(cost) }),
                                        [
                                            { name: t("Cancel"), class: "outline" },
                                            {
                                                name: t("Upgrade"),
                                                class: "outline",
                                                action: () => {
                                                    const { success, fail, cost } = doBatchUpgrade(
                                                        entity,
                                                        entity.level
                                                    );
                                                    G.audio.playClick();
                                                    showToast(
                                                        t("BatchOperationResult", {
                                                            success,
                                                            fail,
                                                            cost: nf(cost),
                                                        })
                                                    );
                                                    hideAlert();
                                                    m.redraw();
                                                },
                                            },
                                        ]
                                    );
                                },
                            },
                            [
                                m("div", `${t("Upgrade")} ${batchModeLabel()}`),
                                m("div", t("BatchUpgradeToLevelX", { level: entity.level })),
                            ]
                        ),
                        m(".hr"),
                        m(
                            ".pointer.blue.two-col",
                            {
                                onclick: () => {
                                    const { count, gain } = getBatchDowngradeEstimate(entity, entity.level);
                                    showAlert(
                                        `${t("DowngradeBuilding")} ${batchModeLabel()} ${t("BatchUpgradeToLevelX", {
                                            level: entity.level,
                                        })}`,
                                        t("BatchOperationGainDesc", { number: count, gain: nf(gain) }),
                                        [
                                            { name: t("Cancel"), class: "outline" },
                                            {
                                                name: t("DowngradeBuilding"),
                                                class: "outline",
                                                action: () => {
                                                    const { success, fail, gain } = doBatchDowngrade(
                                                        entity,
                                                        entity.level
                                                    );
                                                    G.audio.playClick();
                                                    showToast(
                                                        t("BatchOperationGainResult", {
                                                            success,
                                                            fail,
                                                            gain: nf(gain),
                                                        })
                                                    );
                                                    hideAlert();
                                                    m.redraw();
                                                },
                                            },
                                        ]
                                    );
                                },
                            },
                            [
                                m("div", `${t("DowngradeBuilding")} ${batchModeLabel()}`),
                                m("div", t("BatchUpgradeToLevelX", { level: entity.level })),
                            ]
                        ),
                        m(".hr"),
                        m(
                            ".pointer.blue.one-col",
                            {
                                onclick: () => {
                                    if (T.currentWaveStatus === "inProgress") {
                                        G.audio.playError();
                                        showToast(t("WaveInProgressBuildRemoveDisabled"));
                                        return;
                                    }
                                  const { count, gain } = doBatchSellEstimate(entity);
                                  showAlert(
                                    `${t("SellBuilding")} ${batchModeLabel()}`,
                                    t("BatchOperationGainDesc", { number: count, gain: nf(gain) }),
                                    [
                                      { name: t("Cancel"), class: "outline" },
                                      {
                                        name: t("SellBuilding"),
                                        class: "outline",
                                        action: () => {
                                          const { success, fail, gain } = doBatchSell(entity);
                                          G.audio.playClick();
                                          showToast(
                                            t("BatchOperationGainResult", {
                                              success,
                                              fail,
                                              gain: nf(gain),
                                            })
                                          );
                                          hideAlert();
                                          routeTo("/main");
                                        },
                                      },
                                    ]
                                  );
                                },
                              },
                            [
                                m("div", `${t("SellBuilding")} ${batchModeLabel()}`),
                            ],
                        ),
                        m(".hr"),
                            m(
                                ".text-s.condensed.text-desc",
                                t("SellBuildingDescV2", {
                                    percent: formatPercent(getSellRefundPercentage()),
                                })
                            )
//dev
                    ]),
                    m(".box", [
                        m(".title", t("ProductionSettings")),
                        ifTrue(!NoAdjacentBonus[entity.type], () => [
                            m(".hr"),
                            m("div.two-col", [
                                m("div", [
                                    m("div", t("AdjacentBonus")),
                                    m(
                                        ".text-s.text-desc",
                                        t("AdjacentBonusDesc", {
                                            bonus: nf(eAdjacentBonus * 100),
                                        })
                                    ),
                                ]),
                                m(
                                    ".ml10",
                                    {
                                        class: adjacentBonus > 0 ? "green" : "text-desc",
                                    },
                                    `${nf(adjacentBonus)}%`
                                ),
                            ]),
                        ]),
                        ifTrue(canInput || building.power < 0, () => [
                            m(".hr"),
                            uiBoxToggle(
                                t("TurnOffProduction"),
                                isPolicyActive("CostSaver") ? t("CostSaverBuildingDesc") : t("TurnOffProductionDesc"),
                                entity.turnOff,
                                () => {
                                    if (isPolicyActive("CostSaver")) {
                                        G.audio.playError();
                                        showToast(t("CostSaverBuildingWarning"));
                                        return;
                                    }
                                    G.audio.playClick();
                                    entity.turnOff = !entity.turnOff;
                                },
                                "4"
                            ),
                            m(".row", [
                                m(
                                    ".mt5.text-m.blue.pointer",
                                    {
                                        onclick: () => {
                                            G.audio.playClick();
                                            batchApply(entity, (e) => (e.turnOff = entity.turnOff));
                                        },
                                    },
                                    t("ApplyToBatch", { batch: batchModeLabel() })
                                ),
                                m(".f1"),
                                m(
                                    ".mt5.text-m",
                                    {
                                        class:
                                            entity.turnOff === D.entityDefault.turnOff ? "text-desc" : "blue pointer",
                                        onclick: () => {
                                            G.audio.playClick();
                                            D.entityDefault.turnOff = entity.turnOff;
                                        },
                                    },
                                    t("SetAsDefault")
                                ),
                            ]),
                        ]),
                        ifTrue(building.power < 0, () => [
                            m(".hr"),
                            uiBoxToggle(t("HighPowerPriority"), t("HighPowerPriorityDesc"), entity.highPriority, () => {
                                G.audio.playClick();
                                entity.highPriority = !entity.highPriority;
                            }),
                            m(".row", [
                                m(
                                    ".mt5.text-m.blue.pointer",
                                    {
                                        onclick: () => {
                                            G.audio.playClick();
                                            batchApply(entity, (e) => (e.highPriority = entity.highPriority));
                                        },
                                    },
                                    t("ApplyToBatch", { batch: batchModeLabel() })
                                ),
                                m(".f1"),
                                m(
                                    ".mt5.text-m",
                                    {
                                        class:
                                            entity.highPriority === D.entityDefault.highPriority
                                                ? "text-desc"
                                                : "blue pointer",
                                        onclick: () => {
                                            G.audio.playClick();
                                            D.entityDefault.highPriority = entity.highPriority;
                                        },
                                    },
                                    t("SetAsDefault")
                                ),
                            ]),
                        ]),
                        ifTrue(canInput, () => [
                            m(".hr"),
                            m(".two-col", [
                                m(
                                    "div",
                                    m("div", [m("div", t("InputBuffer")), m(".text-desc.text-s", t("InputBufferDesc"))])
                                ),
                                m(
                                    ".ml20",
                                    m(
                                        "select.text-m",
                                        {
                                            onchange: (e) => {
                                                entity.inputBuffer = e.target.value;
                                            },
                                        },
                                        keysOf(InputBufferTypes).map((k) =>
                                            m(
                                                "option",
                                                {
                                                    key: k,
                                                    value: k,
                                                    selected: entity.inputBuffer === k,
                                                },
                                                InputBufferTypes[k]()
                                            )
                                        )
                                    )
                                ),
                            ]),
                            m(".row", [
                                m(
                                    ".mt5.text-m.blue.pointer",
                                    {
                                        onclick: () => {
                                            G.audio.playClick();
                                            batchApply(entity, (e) => (e.inputBuffer = entity.inputBuffer));
                                        },
                                    },
                                    t("ApplyToBatch", { batch: batchModeLabel() })
                                ),
                                m(".f1"),
                                m(
                                    ".mt5.text-m",
                                    {
                                        class:
                                            entity.inputBuffer === D.entityDefault.inputBuffer
                                                ? "text-desc"
                                                : "blue pointer",
                                        onclick: () => {
                                            G.audio.playClick();
                                            D.entityDefault.inputBuffer = entity.inputBuffer;
                                        },
                                    },
                                    t("SetAsDefault")
                                ),
                            ]),
                            m(".hr"),
                            m(".two-col", [
                                m(
                                    "div",
                                    m("div", [
                                        m("div", t("InputCapacityOverride")),
                                        m(
                                            ".text-desc.text-s",
                                            t("InputCapacityOverrideDesc", {
                                                percent: InputCapacityOverrideTypes[entity.inputCapacityOverride](),
                                            })
                                        ),
                                    ])
                                ),
                                m(
                                    ".ml20",
                                    m(
                                        "select.text-m",
                                        {
                                            onchange: (e) => {
                                                entity.inputCapacityOverride = e.target.value;
                                            },
                                        },
                                        keysOf(InputCapacityOverrideTypes).map((k) =>
                                            m(
                                                "option",
                                                {
                                                    key: k,
                                                    value: k,
                                                    selected: entity.inputCapacityOverride === k,
                                                },
                                                InputCapacityOverrideTypes[k]()
                                            )
                                        )
                                    )
                                ),
                            ]),
                            m(".row", [
                                m(
                                    ".mt5.text-m.blue.pointer",
                                    {
                                        onclick: () => {
                                            G.audio.playClick();
                                            batchApply(
                                                entity,
                                                (e) => (e.inputCapacityOverride = entity.inputCapacityOverride)
                                            );
                                        },
                                    },
                                    t("ApplyToBatch", { batch: batchModeLabel() })
                                ),
                                m(".f1"),
                                m(
                                    ".mt5.text-m",
                                    {
                                        class:
                                            entity.inputCapacityOverride === D.entityDefault.inputCapacityOverride
                                                ? "text-desc"
                                                : "blue pointer",
                                        onclick: () => {
                                            G.audio.playClick();
                                            D.entityDefault.inputCapacityOverride = entity.inputCapacityOverride;
                                        },
                                    },
                                    t("SetAsDefault")
                                ),
                            ]),
                            m(".hr"),
                            m(".two-col", [
                                m("div", [
                                    m("div", t("MaxInputDistance")),
                                    m(".text-s.text-desc", t("MaxInputDistanceDesc")),
                                ]),
                                m(".ml20.row.blue", [
                                    m(
                                        ".pointer",
                                        {
                                            onclick: () => {
                                                G.audio.playClick();
                                                const v = (entity.maxTile - 1) % 10;
                                                entity.maxTile = v < 0 ? 9 : v;
                                            },
                                        },
                                        iconB("remove_circle")
                                    ),
                                    m(".text-center.w30", `${maxTile === 0 ? "∞" : maxTile}`),
                                    m(
                                        ".pointer",
                                        {
                                            onclick: () => {
                                                G.audio.playClick();
                                                entity.maxTile = (entity.maxTile + 1) % 10;
                                            },
                                        },
                                        iconB("add_circle")
                                    ),
                                ]),
                            ]),
                            m(
                                ".mt5.text-m.blue.pointer",
                                {
                                    onclick: () => {
                                        G.audio.playClick();
                                        batchApply(entity, (e) => (e.maxTile = entity.maxTile));
                                    },
                                },
                                t("ApplyToBatch", { batch: batchModeLabel() })
                            ),
                        ]),
                        ifTrue(canInput && hasDLC(DLC[1]), () => [
                            m(".hr"),
                            uiBoxToggle(t("MultipleSources"), t("MultipleSourcesDesc"), entity.partialTransport, () => {
                                G.audio.playClick();
                                entity.partialTransport = !entity.partialTransport;
                            }),
                            m(".row", [
                                m(
                                    ".mt5.text-m.blue.pointer",
                                    {
                                        onclick: () => {
                                            G.audio.playClick();
                                            batchApply(entity, (e) => (e.partialTransport = entity.partialTransport));
                                        },
                                    },
                                    t("ApplyToBatch", { batch: batchModeLabel() })
                                ),
                                m(".f1"),
                                m(
                                    ".mt5.text-m",
                                    {
                                        class:
                                            entity.partialTransport === D.entityDefault.partialTransport
                                                ? "text-desc"
                                                : "blue pointer",
                                        onclick: () => {
                                            G.audio.playClick();
                                            D.entityDefault.partialTransport = entity.partialTransport;
                                        },
                                    },
                                    t("SetAsDefault")
                                ),
                            ]),
                        ]),
                        ifTrue(canInput && hasDLC(DLC[1]), () => [
                            m(".hr"),
                            m(".two-col", [
                                m("div", [
                                    m("div", t("BuildingSourceFallback")),
                                    m(".text-s.text-desc", t("BuildingSourceFallbackDesc")),
                                ]),
                                m(
                                    ".ml20",
                                    m(
                                        "select.text-m",
                                        {
                                            onchange: (e) => {
                                                entity.inputOverrideFallback = e.target.value;
                                            },
                                        },
                                        keysOf(InputOverrideFallbackOptions).map((k) =>
                                            m(
                                                "option",
                                                {
                                                    key: k,
                                                    value: k,
                                                    selected: entity.inputOverrideFallback == k,
                                                },
                                                InputOverrideFallbackOptions[k]()
                                            )
                                        )
                                    )
                                ),
                            ]),
                            m(".row", [
                                m(
                                    ".mt5.text-m.blue.pointer",
                                    {
                                        onclick: () => {
                                            G.audio.playClick();
                                            batchApply(
                                                entity,
                                                (e) => (e.inputOverrideFallback = entity.inputOverrideFallback)
                                            );
                                        },
                                    },
                                    t("ApplyToBatch", { batch: batchModeLabel() })
                                ),
                                m(".f1"),
                                m(
                                    ".mt5.text-m",
                                    {
                                        class:
                                            entity.inputOverrideFallback === D.entityDefault.inputOverrideFallback
                                                ? "text-desc"
                                                : "blue pointer",
                                        onclick: () => {
                                            G.audio.playClick();
                                            D.entityDefault.inputOverrideFallback = entity.inputOverrideFallback;
                                        },
                                    },
                                    t("SetAsDefault")
                                ),
                            ]),
                        ]),
                        ifTrue(canInput && (canOutput || building.power > 0), () => [
                            m(".hr"),
                            m(".two-col", [
                                m("div", [
                                    m("div", t("ProductionCycleLength")),
                                    m(".text-s.text-desc", t("ProductionCycleLengthDesc")),
                                ]),
                                m(".ml20.row.blue", [
                                    m(
                                        ".pointer",
                                        {
                                            onclick: () => {
                                                G.audio.playClick();
                                                const v = ((entity.tickSec - 2) % 10) + 1;
                                                entity.tickSec = v <= 0 ? 10 : v;
                                            },
                                        },
                                        iconB("remove_circle")
                                    ),
                                    m(".text-center.w30", `${getOrSet(entity, "tickSec", 1)}`),
                                    m(
                                        ".pointer",
                                        {
                                            onclick: () => {
                                                G.audio.playClick();
                                                entity.tickSec = (entity.tickSec % 10) + 1;
                                            },
                                        },
                                        iconB("add_circle")
                                    ),
                                ]),
                            ]),
                            m(
                                ".mt5.text-m.blue.pointer",
                                {
                                    onclick: () => {
                                        G.audio.playClick();
                                        batchApply(entity, (e) => (e.tickSec = entity.tickSec));
                                    },
                                },
                                t("ApplyToBatch", { batch: batchModeLabel() })
                            ),
                        ]),
                    ]),
                    m(".box.two-col", [
                        m("div", [
                            t("BuildingCustomColor"),
                            ifTrue(buildingHasColor(entity.type), () =>
                                m(
                                    "span.ml5.text-m.pointer.blue",
                                    {
                                        onclick: () => resetBuildingColor(entity.type),
                                    },
                                    t("BuildingCustomColorReset")
                                )
                            ),
                        ]),
                        m(
                            "div",
                            m("input.color-picker", {
                                type: "color",
                                oninput: (e) => {
                                    setBuildingColor(entity.type, e.target.value);
                                },
                                value: getBuildingColor(entity.type),
                            })
                        ),
                    ]),
                    m(".box", [
                        m(".title", t("Storage")),
                        keysOf(entity.resources).map((r) => {
                            return [
                                m(".hr"),
                                m(
                                    "div.two-col",
                                    {
                                        onclick: () => {
                                            if (CC_DEBUG) {
                                                cc.log(entity.resources);
                                                entity.resources[r] = 0;
                                            }
                                        },
                                    },
                                    [
                                        m("div", m("div", { class: r === "Cap" ? "orange" : "" }, RES[r].name())),
                                        m(".text-desc", `${nf(getOrSet(entity.resources, r, 0))}`),
                                    ]
                                ),
                            ];
                        }),
                    ]),
                    ifTrue(
                        hasDLC(DLC[1]) &&
                            qualifyForOfflineProduction(entity.type) &&
                            // If something has `tickOfflineEarning`, then
                            // you should show your own offline earning panel
                            // instead of showing the generic one!
                            !building.tickOfflineEarning,
                        () =>
                            m(".box", [
                                m(".two-col", [
                                    m("div", [
                                        m("div", t("OfflineProduction")),
                                        m(".text-s.text-desc", t("OfflineProductionDesc")),
                                    ]),
                                    m(".ml10", formatHMS(getOfflineProductionSecond(entity) * SECOND)),
                                ]),
                            ])
                    ),
                    m(".box", [
                        m(MoveBuildingPanel, { entity }),
                        ifTrue(entity.level > 1, () => [
                            m(
                                ".two-col.red.pointer",
                                {
                                    "data-shortcut": "9",
                                    onclick: () => {
                                        G.audio.playClick();
                                        if (entity.level > 1) {
                                            refundCash(downgradeRefund());
                                            entity.level--;
                                        }
                                    },
                                },
                                [
                                    m("div", [shortcut("9", "", " "), t("DowngradeBuilding")]),
                                    m("div", `+$${nf(downgradeRefund())}`),
                                ]
                            ),
                            m(".hr"),
                        ]),
                        m(
                            ".two-col.red.pointer",
                            {
                                "data-shortcut": "0",
                                onclick: () => {
                                    if (T.currentWaveStatus === "inProgress") {
                                        G.audio.playError();
                                        showToast(t("WaveInProgressBuildRemoveDisabled"));
                                        return;
                                    }
                                    routeTo("/main");
                                    const b = G.world.removeBuilding(grid);
                                    if (b) {
                                        refundForSellingBuilding(b, sellRefund(), getSellRefundPercentage());
                                    }
                                },
                            },
                            [m("div", [shortcut("0", "", " "), t("SellBuilding")]), m("div", `+$${nf(sellRefund())}`)]
                        ),
                        m(".hr"),
                        m(
                            ".text-s.condensed.text-desc",
                            t("SellBuildingDescV2", {
                                percent: formatPercent(getSellRefundPercentage()),
                            })
                        ),
                    ]),
                ]),
            ]);
        },
    };
}
