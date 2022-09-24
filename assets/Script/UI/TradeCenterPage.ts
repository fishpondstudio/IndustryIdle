import {
    canPrice,
    canTradeLocally,
    getCash,
    getResDiff,
    RES,
    resourcesBeingProducedOrSold,
    resourcesCanBeProduced,
    trySpendCash,
    upgradeAutoSellCapacityCost,
    upgradeAutoSellConcurrencyCost,
} from "../CoreGame/Logic/Logic";
import { cashForBuyOrSell, getPrice, priceUpdateInterval, tryBuyOrSell } from "../CoreGame/Logic/Price";
import { baselineAutoSellCapacity, getAutoSellCapacityPercentage } from "../CoreGame/Logic/Production";
import { isPolicyActive } from "../CoreGame/Logic/SelfContained";
import { Resources } from "../CoreGame/ResourceDefinitions";
import { D, G, T } from "../General/GameData";
import { formatHMS, formatPercent, ifTrue, keysOf, nf, numberSign } from "../General/Helper";
import { t } from "../General/i18n";
import { serverNow } from "../General/ServerClock";
import { CrazyGameAdBanner } from "./CrazyGameAdBanner";
import { Desktop } from "./HudPage";
import { getContainerClass, iconB, isMobile, uiBoxContent, uiBoxToggleContent, uiHeaderAction } from "./UIHelper";
import { routeTo, showToast } from "./UISystem";

const BuyAmounts = [1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12, 1e13, 1e14];

let sortBy: "price" | "amount" | "name" = "price";
let hideResourcesNotProducing = false;
export function TradeCenterPage(): m.Comp<{ docked: boolean }> {
    let resourceToBuy: keyof Resources = null;
    let buyAmount = BuyAmounts[0];
    return {
        oninit: () => {
            const canProduce = resourcesCanBeProduced();
            keysOf(D.autoSellRes).forEach((k) => {
                if (!canProduce[k]) {
                    delete D.autoSellRes[k];
                }
            });
        },
        view: (vnode) => {
            const entity = G.tradeCenter;
            const visual = G.world.getBuildingVisual(entity.grid);
            const notEnoughFuel = visual && visual.notEnoughFuel;
            let resources = resourcesBeingProducedOrSold();
            if (!hideResourcesNotProducing) {
                const canProduce = resourcesCanBeProduced();
                resources.forEach((r) => {
                    canProduce[r] = true;
                });
                resources = keysOf(canProduce);
            }
            resources = resources.filter(canTradeLocally).sort((a, b) => {
                if (sortBy === "amount") {
                    return T.res[b] - T.res[a];
                }
                if (sortBy === "price") {
                    return getPrice(b) - getPrice(a);
                }
                return RES[a].name().localeCompare(RES[b].name());
            });

            const ascapCost = upgradeAutoSellCapacityCost();
            const ascurCost = upgradeAutoSellConcurrencyCost();

            return m("div", { class: getContainerClass(vnode.attrs.docked) }, [
                uiHeaderAction(
                    t("TradeCenter"),
                    () => {
                        if (vnode.attrs.docked) {
                            Desktop.secondaryPage = null;
                        } else {
                            routeTo("/main");
                        }
                    },
                    isMobile() || vnode.attrs.docked ? null : () => (Desktop.secondaryPage = TradeCenterPage())
                ),
                m("div.scrollable", [
                    m(CrazyGameAdBanner),
                    m(".box", [
                        ifTrue(!D.persisted.leaderboardOptOut, () => [
                            m(".two-col.banner.pointer", { onclick: () => routeTo("/player-trade") }, [
                                m(".text-s.uppercase", t("PlayerTradeBanner")),
                                m("div", { style: { margin: "-10px 0" } }, iconB("arrow_forward")),
                            ]),
                            m(".hr.dashed"),
                        ]),
                        uiBoxToggleContent(
                            m(".text-s.uppercase", t("HideNotProducing")),
                            hideResourcesNotProducing,
                            () => {
                                G.audio.playClick();
                                hideResourcesNotProducing = !hideResourcesNotProducing;
                            },
                            { style: "margin: -10px 0" },
                            24
                        ),
                        m(".hr"),
                        m(".row.text-s.uppercase", [
                            m(".f1.mr20", t("SortBy")),
                            m(
                                ".pointer",
                                {
                                    class: sortBy === "price" ? "blue" : "text-desc",
                                    onclick: () => (sortBy = "price"),
                                },
                                t("SortByPrice")
                            ),
                            m(
                                ".ml20.pointer",
                                {
                                    class: sortBy === "amount" ? "blue" : "text-desc",
                                    onclick: () => (sortBy = "amount"),
                                },
                                t("SortByAmount")
                            ),
                            m(
                                ".ml20.pointer",
                                {
                                    class: sortBy === "name" ? "blue" : "text-desc",
                                    onclick: () => (sortBy = "name"),
                                },
                                t("SortByName")
                            ),
                        ]),
                    ]),
                    m(
                        ".data-table",
                        m("table", [
                            m("tr", [
                                m(
                                    "th",
                                    { colspan: 2 },
                                    t("MarketUpdateIn", {
                                        time: formatHMS((D.lastPricedAt + 1) * priceUpdateInterval() - serverNow()),
                                    })
                                ),
                                m("th.r", { colspan: 2 }, t("AutoSell")),
                            ]),
                            resources.map((r) => {
                                function toggleAutoSell() {
                                    if (D.autoSellRes[r]) {
                                        G.audio.playClick();
                                        delete D.autoSellRes[r];
                                    } else {
                                        if (Object.keys(D.autoSellRes).length >= D.autoSellConcurrency) {
                                            G.audio.playError();
                                            showToast(t("MaxAutoSellConcurrencyReached"));
                                        } else {
                                            G.audio.playClick();
                                            D.autoSellRes[r] = true;
                                        }
                                    }
                                }
                                let autoSell = m(
                                    ".pointer",
                                    {
                                        class: "red",
                                        onclick: toggleAutoSell,
                                    },
                                    iconB("toggle_off")
                                );
                                if (D.autoSellRes[r]) {
                                    autoSell = m(".green.pointer", { onclick: toggleAutoSell }, iconB("toggle_on"));
                                }
                                const diff = getResDiff(r);
                                return [
                                    m("tr", [
                                        m(
                                            "td.pointer",
                                            {
                                                onclick: () => {
                                                    if (resourceToBuy === r) {
                                                        resourceToBuy = null;
                                                    } else {
                                                        resourceToBuy = r;
                                                    }
                                                },
                                            },
                                            iconB(
                                                resourceToBuy === r ? "remove_circle_outline" : "add_circle_outline",
                                                18,
                                                5,
                                                {},
                                                { class: "blue" }
                                            )
                                        ),
                                        m("td", [
                                            m("div", RES[r].name()),
                                            m(".text-s.text-desc", [
                                                m("span.mr5", `${nf(T.res[r])}`),
                                                m(
                                                    "span.mr10",
                                                    {
                                                        class: diff >= 0 ? "green" : "red",
                                                    },
                                                    `${numberSign(diff)}${nf(Math.abs(diff))}/s`
                                                ),
                                            ]),
                                        ]),
                                        m("td.r", [
                                            m("div", ["$", nf(getPrice(r))]),
                                            ifTrue(!D.persisted.leaderboardOptOut, () =>
                                                m(
                                                    ".text-s.pointer",
                                                    {
                                                        onclick: () => {
                                                            routeTo("/player-trade", { resources: r });
                                                        },
                                                    },
                                                    [
                                                        m(
                                                            "span.red",
                                                            { title: t("BuyFromTradeCenterBestBid") },
                                                            G.socket.bestBids[r] > 0
                                                                ? `$${nf(G.socket.bestBids[r])}`
                                                                : ""
                                                        ),
                                                        m("span.text-desc", " / "),
                                                        m(
                                                            "span.green",
                                                            { title: t("BuyFromTradeCenterBestAsk") },
                                                            G.socket.bestAsks[r] > 0
                                                                ? `$${nf(G.socket.bestAsks[r])}`
                                                                : ""
                                                        ),
                                                    ]
                                                )
                                            ),
                                        ]),
                                        m("td.r", { style: "width: 50px" }, autoSell),
                                    ]),
                                    ifTrue(resourceToBuy === r, () => {
                                        const cost = -cashForBuyOrSell(r, buyAmount);
                                        return m("tr", [
                                            m("td", { colspan: 4 }, [
                                                m(".text-s.uppercase", t("BuyFromTradeCenter")),
                                                m(".row", [
                                                    m(
                                                        ".div",
                                                        m(
                                                            "select.text-m",
                                                            {
                                                                onchange: (e) => {
                                                                    buyAmount = parseInt(e.target.value, 10);
                                                                },
                                                            },
                                                            BuyAmounts.map((k) =>
                                                                m(
                                                                    "option",
                                                                    {
                                                                        key: k,
                                                                        value: k,
                                                                        selected: Math.abs(buyAmount - k) < 1,
                                                                    },
                                                                    nf(k)
                                                                )
                                                            )
                                                        )
                                                    ),
                                                    m(".f1"),
                                                    m(".text-right", [
                                                        m(
                                                            ".pointer",
                                                            {
                                                                class: getCash() >= cost ? "blue" : "text-desc",
                                                                onclick: () => {
                                                                    if (tryBuyOrSell(r, buyAmount)) {
                                                                        G.audio.playEffect(G.audio.kaching);
                                                                    } else {
                                                                        G.audio.playError();
                                                                        showToast(t("NotEnoughCash"));
                                                                    }
                                                                },
                                                            },
                                                            `$${nf(cost)}`
                                                        ),
                                                        m(
                                                            ".text-s.text-desc",
                                                            t("BuyFromTradeCenterAveragePrice", {
                                                                price: `$${nf(cost / buyAmount)}`,
                                                            })
                                                        ),
                                                    ]),
                                                ]),
                                                ifTrue(G.socket.resourceTrades[r] > 0, () => [
                                                    m(".hr.dashed"),
                                                    m(
                                                        ".two-col.orange.text-m.pointer",
                                                        {
                                                            onclick: () => {
                                                                routeTo("/player-trade", { resources: r });
                                                            },
                                                        },
                                                        [
                                                            m(
                                                                "div",
                                                                t("PlayerTradesAvailable", {
                                                                    number: G.socket.resourceTrades[r],
                                                                })
                                                            ),
                                                            iconB("arrow_forward", 18, 0, {}, { class: "mv-10" }),
                                                        ]
                                                    ),
                                                ]),
                                            ]),
                                        ]);
                                    }),
                                ];
                            }),
                        ])
                    ),
                    uiBoxContent(
                        t("AutoSellCapacity"),
                        [
                            m("div", t("AutoSellCapacityDescV2")),
                            m(
                                ".orange",
                                t("BaselineAutoSellCapacity", {
                                    amount: nf(baselineAutoSellCapacity()),
                                })
                            ),
                            m(
                                ".orange",
                                t("AutoSellCapacityExtraPercentageFromSwiss", {
                                    n:
                                        D.swissBoosts.autoSellCapacityMultiplier +
                                        D.persisted.autoSellCapacityMultiplier,
                                })
                            ),
                        ],
                        formatPercent(getAutoSellCapacityPercentage()),
                        D.autoSellPerSec >= 40 ? t("MaxUpgrade") : `${t("Upgrade")} $${nf(ascapCost)}`,
                        () => {
                            if (D.autoSellPerSec >= 40) {
                                showToast(t("MaxUpgradeDesc"));
                                G.audio.playError();
                            } else if (trySpendCash(upgradeAutoSellCapacityCost())) {
                                D.autoSellPerSec++;
                                G.audio.playClick();
                            } else {
                                G.audio.playError();
                                showToast(t("NotEnoughCash"));
                            }
                        },
                        getCash() >= ascapCost
                    ),
                    uiBoxContent(
                        t("AutoSellConcurrency"),
                        t("AutoSellConcurrencyDesc"),
                        D.autoSellConcurrency,
                        `${t("Upgrade")} $${nf(ascurCost)}`,
                        () => {
                            if (trySpendCash(upgradeAutoSellConcurrencyCost())) {
                                D.autoSellConcurrency++;
                                G.audio.playClick();
                            } else {
                                G.audio.playError();
                                showToast(t("NotEnoughCash"));
                            }
                        },
                        getCash() >= ascurCost
                    ),
                    m(
                        ".box.banner.text-m.blue",
                        {
                            style: {
                                display: isPolicyActive("ShoppingSpree") ? "block" : "none",
                            },
                        },
                        t("ShoppingSpreeTradeCenterDesc")
                    ),
                    m(".box", [
                        m(".title.two-col", [
                            m("div", t("TradeWarehouse")),
                            m(
                                "div.red",
                                {
                                    style: {
                                        display: notEnoughFuel ? "block" : "none",
                                    },
                                },
                                t("BuildingNotEnoughFuel", {
                                    fuel: RES[D.fuelResType].name(),
                                })
                            ),
                        ]),
                        keysOf(entity.resources)
                            .filter(canPrice)
                            .sort((a, b) => RES[a].name().localeCompare(RES[b].name()))
                            .map((r) => {
                                return [
                                    m(".hr"),
                                    m(".two-col", [
                                        m("div", m("div", RES[r].name())),
                                        m(".text-desc", `${nf(entity.resources[r])}`),
                                    ]),
                                ];
                            }),
                    ]),
                ]),
            ]);
        },
    };
}
