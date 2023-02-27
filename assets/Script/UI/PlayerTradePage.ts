import { ResourceSet } from "../CoreGame/Buildings/BuildingDefinitions";
import {
    canTradeWithPlayers,
    getCash,
    getResourcesForCash,
    hasEnoughCash,
    RES,
    resourcesBeingProduced,
    tryDeductCash,
    tryDeductResources,
} from "../CoreGame/Logic/Logic";
import {
    acceptTrade,
    addTrade,
    cancelTrade,
    claimTradeUI,
    getMarketCapTaxCreditPercent,
    getOrderSides,
    ILocalTrade,
    isBetterThanMarket,
    ITrade,
    maxActiveTrades,
    newTrade,
    OrderSide,
    REFUND_PERCENT,
    taxCalculation,
} from "../CoreGame/Logic/PlayerTrade";
import { getPrice } from "../CoreGame/Logic/Price";
import { Resources } from "../CoreGame/ResourceDefinitions";
import { D, G, hasAnyDlc, removeTrade, T } from "../General/GameData";
import {
    forEach,
    formatPercent,
    formatPercentPrecise,
    hasValue,
    ifTrue,
    keysOf,
    nf,
    SECOND,
    selectOf,
    sizeOf,
    truncate,
} from "../General/Helper";
import { t } from "../General/i18n";
import { serverNow } from "../General/ServerClock";
import { resolveTradeFine } from "../General/Socket";
import { CrazyGameAdBanner } from "./CrazyGameAdBanner";
import { Desktop } from "./HudPage";
import { getContainerClass, iconB, isMobile, uiHeaderAction, uiHeaderActionBack } from "./UIHelper";
import { hideAlert, routeTo, showAlert, showToast } from "./UISystem";

type SideFilter = OrderSide | "";

let lastAcceptTradeAt = 0;
let sideFilter: SideFilter = "";

type PriceFilter = "BestPriceOnly" | "BetterThanMarket" | "All";
let priceFilter: PriceFilter = "All";
const PriceFilters: Record<PriceFilter, () => string> = {
    All: () => t("PlayerTradeFilterAll"),
    BetterThanMarket: () => t("PlayerTradeFilterBetterThanMarket"),
    BestPriceOnly: () => t("PlayerTradeFilterBestPrice"),
};
let draftTrade: ILocalTrade;
let resourceFilter: ResourceSet = {};
let showResourceFilter = false;
let showPriceFilter = false;

interface NumberFilter {
    value: number;
    text: string;
}
let maxResourceAmount: NumberFilter = { value: 0, text: "" };
let minPriceFilter: NumberFilter = { value: 0, text: "" };
let maxPriceFilter: NumberFilter = { value: 0, text: "" };

let playerNameFilter = "";

export function PlayerTradePage(): m.Comp<{
    docked: boolean;
    resources?: string;
}> {
    let announcement: string;

    function setTradeResource(res: keyof Resources) {
        draftTrade.resource = res;
        draftTrade.price = Math.round(getPrice(draftTrade.resource));
    }

    return {
        oninit: (vnode) => {
            fetch("https://play.industryidle.com/config.json")
                .then((r) => r.json())
                .then((j) => (announcement = j?.playerTrade));
            if (vnode.attrs.resources) {
                resourceFilter = {};
                vnode.attrs.resources.split(",").forEach((res) => {
                    if (RES[res]) {
                        resourceFilter[res] = true;
                    }
                });
            }
        },
        view: (vnode) => {
            if (D.persisted.leaderboardOptOut) {
                routeTo("/main");
                G.audio.playError();
                showToast(t("PlayerTradeOptOut"));
                return null;
            }
            const resources = (D.map === "HongKong" ? keysOf(T.usableRes) : resourcesBeingProduced())
                .filter((k) => T.usableRes[k] > 0 && canTradeWithPlayers(k))
                .sort((a, b) => RES[a].name().localeCompare(RES[b].name()));
            if (resources.length <= 0) {
                routeTo("/main");
                G.audio.playError();
                showToast(t("PlayerTradeUnavailable"));
                return null;
            }
            const activeTrades = selectOf(G.socket.activeTrades, (_, trade) => hasValue(RES[trade.resource]));
            if (!draftTrade) {
                draftTrade = newTrade();
            }
            if (!draftTrade.resource || !resources.includes(draftTrade.resource)) {
                setTradeResource(resources[0]);
            }
            const allResourceFilters: ResourceSet = {};
            forEach(activeTrades, (_, t) => {
                allResourceFilters[t.resource] = true;
            });
            forEach(resourceFilter, (res) => {
                if (!allResourceFilters[res]) {
                    delete resourceFilter[res];
                }
            });
            const sides = getOrderSides();
            const sideFilters: Record<SideFilter, string> = {
                "": "",
                sell: t("PlayerTradeAsk"),
                buy: t("PlayerTradeBid"),
            };
            const isResourceFilterEmpty = cc.js.isEmptyObject(resourceFilter);
            let header = uiHeaderActionBack(
                t("PlayerTrade"),
                () => G.world.routeTo(G.tradeCenter.grid),
                isMobile() ? null : () => (Desktop.secondaryPage = PlayerTradePage())
            );
            if (vnode.attrs.docked) {
                header = uiHeaderAction(t("PlayerTrade"), () => {
                    Desktop.secondaryPage = null;
                });
            }
            const bestBids: Partial<Record<keyof Resources, ITrade>> = {};
            const bestAsks: Partial<Record<keyof Resources, ITrade>> = {};
            forEach(G.socket.activeTrades, (id, trade) => {
                if (trade.side === "buy") {
                    if (!bestBids[trade.resource] || trade.price > bestBids[trade.resource].price) {
                        bestBids[trade.resource] = trade;
                    }
                }
                if (trade.side === "sell") {
                    if (!bestAsks[trade.resource] || trade.price < bestAsks[trade.resource].price) {
                        bestAsks[trade.resource] = trade;
                    }
                }
            });
            const tax = taxCalculation(draftTrade);
            const minPrice = D.price[draftTrade.resource].price / 5;
            const maxPrice = D.price[draftTrade.resource].price * 5;

            let numberOfBetterTrades = 0;

            for (const key in G.socket.activeTrades) {
                const trade = G.socket.activeTrades[key];
                const betterPriceAvailable =
                    // I want to buy, but there's already a sell order that offers lower price
                    (draftTrade.side === "buy" && trade.side === "sell" && trade.price <= draftTrade.price) ||
                    // I want to sell, but there's already a buy order that offers higher price
                    (draftTrade.side === "sell" && trade.side === "buy" && trade.price >= draftTrade.price);
                if (trade.resource === draftTrade.resource && betterPriceAvailable) {
                    numberOfBetterTrades++;
                }
            }

            return m("div", { class: getContainerClass(vnode.attrs.docked) }, [
                header,
                m("div.scrollable", [
                    m(CrazyGameAdBanner),
                    m(".box", [
                        m(".title", t("AddTrade")),
                        m(".hr"),
                        ifTrue(!!announcement, () => [m(".text-m.banner", announcement), m(".hr")]),
                        m(".row", [
                            m(
                                "select.text-m",
                                {
                                    onchange: (e) => {
                                        draftTrade.side = e.target.value;
                                    },
                                },
                                keysOf(sides).map((k) =>
                                    m(
                                        "option",
                                        {
                                            key: k,
                                            value: k,
                                            selected: draftTrade.side === k,
                                        },
                                        sides[k]
                                    )
                                )
                            ),
                            m(".f1"),
                            m(
                                "select.text-m",
                                {
                                    onchange: (e) => {
                                        setTradeResource(e.target.value);
                                    },
                                },
                                resources.map((k) =>
                                    m(
                                        "option",
                                        {
                                            key: k,
                                            value: k,
                                            selected: draftTrade.resource === k,
                                        },
                                        RES[k].name()
                                    )
                                )
                            ),
                        ]),
                        m(".hr"),
                        m(".two-col", [
                            m("div", m("div", t("PlayerTradeAmount"))),
                            m("input", {
                                min: 0,
                                step: 1,
                                type: "number",
                                value: draftTrade?.amount,
                                oninput: (e) => {
                                    draftTrade.amount = parseInt(e.target.value, 10) || 0;
                                },
                            }),
                        ]),
                        m(".two-col.text-desc.text-s", [
                            m(
                                "div",
                                t("PlayerTradeValidRange", {
                                    min: "1",
                                    max: nf(
                                        draftTrade.side === "sell"
                                            ? Math.floor(T.usableRes[draftTrade.resource])
                                            : Math.floor(getCash() / draftTrade.price)
                                    ),
                                })
                            ),
                            m("div", nf(draftTrade.amount)),
                        ]),
                        m(".hr"),
                        m(".two-col", [
                            m("div", t("PlayerTradePrice")),
                            m("input", {
                                type: "number",
                                min: 0,
                                step: 1,
                                value: draftTrade?.price,
                                oninput: (e) => {
                                    draftTrade.price = parseInt(e.target.value, 10) || 0;
                                },
                            }),
                        ]),
                        m(".two-col.text-desc.text-s", [
                            m("div", [
                                t("PlayerTradeLocalPrice", {
                                    price: "$" + nf(getPrice(draftTrade.resource)),
                                }),
                                ". ",
                                t("PlayerTradeValidRange", {
                                    min: `$${nf(minPrice)}`,
                                    max: `$${nf(maxPrice)}`,
                                }),
                            ]),
                            m("div", nf(draftTrade.price)),
                        ]),
                        m(".hr"),
                        m(ShowTaxCalculation, {
                            resource: draftTrade.resource,
                            amount: draftTrade.amount,
                            price: draftTrade.price,
                        }),
                        m(".hr"),
                        ifTrue(numberOfBetterTrades > 0, () => [
                            m(".text-m.banner", [
                                m("div", t("PlayerTradeBetterTradesAvailable", { count: numberOfBetterTrades })),
                                m(".hr.dotted"),
                                m(
                                    ".row.text-m.uppercase.pointer",
                                    {
                                        onclick: () => {
                                            sideFilter = draftTrade.side === "buy" ? "sell" : "buy";
                                            resourceFilter = { [draftTrade.resource]: true };
                                        },
                                    },
                                    [
                                        m(".f1", t("PlayerTradeBetterTradesAvailableAction")),
                                        iconB("arrow_forward", 18, 0, { margin: "-10px 0 -10px 10px" }),
                                    ]
                                ),
                            ]),
                            m(".hr"),
                        ]),
                        m(
                            ".row.blue.pointer",
                            {
                                onclick: async () => {
                                    try {
                                        if (draftTrade.amount < 1) {
                                            throw new Error(t("PlayerTradeAmountNotValidV2"));
                                        }
                                        if (draftTrade.price < minPrice || draftTrade.price > maxPrice) {
                                            throw new Error(
                                                t("PlayerTradePriceNotValidV2", {
                                                    min: "$" + nf(minPrice),
                                                    max: "$" + nf(maxPrice),
                                                })
                                            );
                                        }
                                        if (Object.keys(G.socket.myTrades).length >= maxActiveTrades()) {
                                            throw new Error(
                                                t("AddTradeExceedMaximumTrade", {
                                                    number: maxActiveTrades(),
                                                })
                                            );
                                        }
                                        await addTrade(draftTrade);
                                        draftTrade = {
                                            ...newTrade(),
                                            resource: draftTrade.resource,
                                            side: draftTrade.side,
                                        };
                                        setTradeResource(resources[0]);
                                        showToast(t("AddTradeSuccess"));
                                        G.audio.playClick();
                                        m.redraw();
                                    } catch (error) {
                                        G.audio.playError();
                                        showToast(error?.message);
                                    }
                                },
                            },
                            [
                                iconB("add_circle", 18, 5),
                                m(".f1", t("AddTrade")),
                                m("div", [
                                    m(".text-right", `$${nf(tax.valueAfterTax)}`),
                                    m(
                                        ".text-right.text-desc.text-s",
                                        RES[draftTrade.resource].name() + " " + nf(tax.amountAfterTax)
                                    ),
                                ]),
                            ]
                        ),
                    ]),
                    ifTrue(G.socket.pendingTradeFines.length > 0, () => {
                        return m(".box", [
                            m(".title", t("PlayerTradePendingFine")),
                            G.socket.pendingTradeFines.map((tf) => [
                                m(".hr"),
                                m(
                                    ".text-m",
                                    t("PlayerTradePendingFineDesc", {
                                        profit: nf(tf.profit),
                                        count: tf.numberOfTrades,
                                        player: tf.playerName,
                                    })
                                ),
                                m(".sep5"),
                                m(
                                    ".text-m.uppercase.blue.pointer.text-right",
                                    {
                                        onclick: () => {
                                            const { amountLeft, resources } = getResourcesForCash(tf.profit);
                                            const enoughCash = hasEnoughCash(tf.profit);
                                            showAlert(
                                                t("PlayerTradePendingFineAction", { profit: nf(tf.profit) }),
                                                m("div", [
                                                    m("div", t("PlayerTradePendingFineActionDesc")),
                                                    m(".sep10"),
                                                    m(".box.no-margin.text-m", [
                                                        m("div", [
                                                            t("PlayerTradePendingFineReturnCash"),
                                                            ": ",
                                                            enoughCash
                                                                ? "$" + nf(tf.profit)
                                                                : t("PlayerTradePendingFineNotEnough"),
                                                        ]),
                                                        m(".hr.dashed"),
                                                        m("div", [
                                                            t("PlayerTradePendingFineReturnResources"),
                                                            ": ",
                                                            amountLeft <= 0
                                                                ? keysOf(resources)
                                                                      .map(
                                                                          (r) => `${RES[r].name()} x${nf(resources[r])}`
                                                                      )
                                                                      .join(", ")
                                                                : t("PlayerTradePendingFineNotEnough"),
                                                        ]),
                                                    ]),
                                                ]),
                                                [
                                                    { name: t("Cancel"), class: "outline" },
                                                    {
                                                        name: t("PlayerTradePendingFineReturnResources"),
                                                        class: amountLeft <= 0 ? "outline" : "outline grey",
                                                        action: async () => {
                                                            if (tryDeductResources(resources)) {
                                                                hideAlert();
                                                                try {
                                                                    await resolveTradeFine(tf);
                                                                } catch (error) {
                                                                    showToast(
                                                                        t("GeneralServerErrorMessage", {
                                                                            error: error,
                                                                        })
                                                                    );
                                                                }
                                                            } else {
                                                                G.audio.playError();
                                                                showToast(t("NotEnoughResources"));
                                                            }
                                                        },
                                                    },
                                                    {
                                                        name: t("PlayerTradePendingFineReturnCash"),
                                                        class: enoughCash ? "outline" : "outline grey",
                                                        action: async () => {
                                                            if (tryDeductCash(tf.profit)) {
                                                                hideAlert();
                                                                try {
                                                                    await resolveTradeFine(tf);
                                                                } catch (error) {
                                                                    showToast(
                                                                        t("GeneralServerErrorMessage", {
                                                                            error: error,
                                                                        })
                                                                    );
                                                                }
                                                            } else {
                                                                G.audio.playError();
                                                                showToast(t("NotEnoughCash"));
                                                            }
                                                        },
                                                    },
                                                ]
                                            );
                                        },
                                    },
                                    t("PlayerTradePendingFineAction", { profit: nf(tf.profit) })
                                ),
                            ]),
                        ]);
                    }),
                    m(".box", [
                        m(".row", [
                            m(".f1"),
                            m(
                                ".row.pointer.blue.ml10",
                                {
                                    onclick: () => (showPriceFilter = !showPriceFilter),
                                },
                                [
                                    iconB(showPriceFilter ? "close" : "filter_list", 20, 5, {}),
                                    m(".uppercase.text-s", "Filter Options"),
                                ]
                            ),
                        ]),
                        ifTrue(showPriceFilter, () => {
                            return m("div", [
                                m(".hr"),
                                m(".row", [
                                    m(
                                        "select.text-m",
                                        {
                                            onchange: (e) => {
                                                sideFilter = e.target.value;
                                            },
                                            style: {
                                                margin: "-10px 0",
                                            },
                                        },
                                        keysOf(sideFilters).map((k) =>
                                            m(
                                                "option",
                                                {
                                                    key: k,
                                                    value: k,
                                                    selected: sideFilter === k,
                                                },
                                                sideFilters[k]
                                            )
                                        )
                                    ),
                                    m(".f1"),
                                    m(
                                        ".row.pointer.blue.ml10",
                                        {
                                            onclick: () => (showResourceFilter = !showResourceFilter),
                                        },
                                        [
                                            iconB(showResourceFilter ? "close" : "filter_list", 20, 5, {}),
                                            m(
                                                ".uppercase.text-s",
                                                isResourceFilterEmpty
                                                    ? t("PlayerTradeFilterResources")
                                                    : t("PlayerTradeFilteringNResources", {
                                                          n: sizeOf(resourceFilter),
                                                      })
                                            ),
                                        ]
                                    ),
                                ]),
                                ifTrue(showResourceFilter, () => {
                                    return m("div", [
                                        m(".hr.dashed"),
                                        m(".row", [
                                            m(
                                                ".text-m.pointer.blue",
                                                {
                                                    onclick: () => {
                                                        resourceFilter = {};
                                                        showResourceFilter = false;
                                                    },
                                                },
                                                m("div", t("PlayerTradeFilterClear"))
                                            ),
                                            m(".f1"),
                                            m(
                                                ".text-m.pointer.blue",
                                                {
                                                    onclick: () => {
                                                        forEach(allResourceFilters, (k) => {
                                                            if (T.res[k]) {
                                                                resourceFilter[k] = true;
                                                            }
                                                        });
                                                        showResourceFilter = false;
                                                    },
                                                },
                                                m("div", t("PlayerTradeFilterWhatIHave"))
                                            ),
                                        ]),
                                        keysOf(allResourceFilters)
                                            .sort((a, b) => RES[a].name().localeCompare(RES[b].name()))
                                            .map((res) => {
                                                return [
                                                    m(".hr.dashed"),
                                                    m(
                                                        ".two-col.text-m.pointer",
                                                        {
                                                            onclick: () => {
                                                                if (resourceFilter[res]) {
                                                                    delete resourceFilter[res];
                                                                } else {
                                                                    resourceFilter[res] = true;
                                                                }
                                                            },
                                                        },
                                                        [
                                                            m("div", RES[res].name()),
                                                            resourceFilter[res]
                                                                ? iconB(
                                                                      "check_box",
                                                                      24,
                                                                      0,
                                                                      {
                                                                          margin: "-10px 0",
                                                                      },
                                                                      { class: "blue" }
                                                                  )
                                                                : iconB(
                                                                      "check_box_outline_blank",
                                                                      24,
                                                                      0,
                                                                      {
                                                                          margin: "-10px 0",
                                                                      },
                                                                      {
                                                                          class: "text-desc",
                                                                      }
                                                                  ),
                                                        ]
                                                    ),
                                                ];
                                            }),
                                    ]);
                                }),
                                m(".hr.dashed"),
                                m(".two-col", [
                                    m(".text-s.uppercase", t("PlayerTradePriceFilter")),
                                    m(
                                        "div",
                                        m(
                                            "select.text-m",
                                            {
                                                onchange: (e) => {
                                                    priceFilter = e.target.value;
                                                },
                                                style: {
                                                    margin: "-10px 0",
                                                },
                                            },
                                            keysOf(PriceFilters).map((k) =>
                                                m(
                                                    "option",
                                                    {
                                                        key: k,
                                                        value: k,
                                                        selected: priceFilter === k,
                                                    },
                                                    PriceFilters[k]()
                                                )
                                            )
                                        )
                                    ),
                                ]),
                                m(".hr.dashed"),
                                m(".two-col", [
                                    m(".text-s.uppercase", "Max Resource Amount"),
                                    m("input", {
                                        placeholder: 0,
                                        type: "text",
                                        value: maxResourceAmount.text,
                                        oninput: (e) => {
                                            maxResourceAmount = { value: Number(e.target.value), text: e.target.value };
                                        },
                                    }),
                                ]),
                                m(".hr.dashed"),
                                m(".row", [
                                    m(".two-col", [
                                        m(".text-s.uppercase", "Min Price"),
                                        m("input", {
                                            placeholder: 0,
                                            type: "text",
                                            style: { "margin-right": "10px" },
                                            value: minPriceFilter.text,
                                            oninput: (e) => {
                                                minPriceFilter = {
                                                    value: Number(e.target.value),
                                                    text: e.target.value,
                                                };
                                            },
                                        }),
                                    ]),
                                    m(".vr.dashed"),
                                    m(".two-col", [
                                        m(".text-s.uppercase", "Max Price"),
                                        m("input", {
                                            placeholder: 0,
                                            type: "text",
                                            value: maxPriceFilter.text,
                                            oninput: (e) => {
                                                maxPriceFilter = {
                                                    value: Number(e.target.value),
                                                    text: e.target.value,
                                                };
                                            },
                                        }),
                                    ]),
                                ]),
                                m(".hr.dashed"),
                                m(".two-col", [
                                    m(".text-s.uppercase", "Player Name"),
                                    m("input.f1", {
                                        type: "text",
                                        value: playerNameFilter,
                                        oninput: (e) => {
                                            playerNameFilter = e.target.value.toLowerCase();
                                        },
                                    }),
                                ]),
                            ]);
                        }),
                    ]),
                    m(
                        ".data-table",
                        m("table", [
                            m("tr", [
                                m("th", t("PlayerTradeResource")),
                                m("th.r"),
                                m("th.r", t("PlayerTradeValue")),
                                m("th.r", t("PlayerTradeAction")),
                            ]),
                            keysOf(G.socket.myTrades)
                                .sort((a, b) => {
                                    const tradeA = G.socket.myTrades[a];
                                    const tradeB = G.socket.myTrades[b];
                                    if (tradeA.status === "filled" && tradeB.status !== "filled") {
                                        return -1;
                                    }
                                    if (tradeB.status === "filled" && tradeA.status !== "filled") {
                                        return 1;
                                    }
                                    return RES[tradeA.resource].name().localeCompare(RES[tradeB.resource].name());
                                })
                                .map((e) => {
                                    const trade = G.socket.myTrades[e];
                                    return renderRow(trade, actionForMyTrade(trade));
                                }),
                            keysOf(activeTrades)
                                .filter((k) => {
                                    const trade = activeTrades[k];
                                    if (G.socket.myTrades[trade.id]) {
                                        return false;
                                    }
                                    const res = isResourceFilterEmpty ? true : resourceFilter[trade.resource];
                                    let p = true;
                                    if (isFinite(maxResourceAmount.value) && maxResourceAmount.value > 0) {
                                        if (trade.amount > maxResourceAmount.value) {
                                            p = false;
                                        }
                                    }
                                    if (isFinite(minPriceFilter.value) && minPriceFilter.value > 0) {
                                        if (trade.price < minPriceFilter.value) {
                                            p = false;
                                        }
                                    }
                                    if (isFinite(maxPriceFilter.value) && maxPriceFilter.value > 0) {
                                        if (trade.price > maxPriceFilter.value) {
                                            p = false;
                                        }
                                    }
                                    if (playerNameFilter.length > 0) {
                                        if (trade.from.toLocaleLowerCase().includes(playerNameFilter) === false) {
                                            p = false;
                                        }
                                    }
                                    if (priceFilter === "BestPriceOnly") {
                                        if (trade.side === "buy") {
                                            p = bestBids[trade.resource].id === trade.id;
                                        }
                                        if (trade.side === "sell") {
                                            p = bestAsks[trade.resource].id === trade.id;
                                        }
                                    }
                                    if (priceFilter === "BetterThanMarket") {
                                        p = isBetterThanMarket(trade);
                                    }
                                    const s = sideFilter === "" ? true : trade.side === sideFilter;
                                    return res && s && p;
                                })
                                .sort((ka, kb) => {
                                    const a = activeTrades[ka];
                                    const b = activeTrades[kb];
                                    const stringCompare = RES[a.resource].name().localeCompare(RES[b.resource].name());
                                    if (stringCompare !== 0) {
                                        return stringCompare;
                                    }
                                    if (a.side === "buy" && b.side === "sell") {
                                        return -1;
                                    }
                                    if (a.side === "sell" && b.side === "buy") {
                                        return 1;
                                    }
                                    return a.side === "buy" ? b.price - a.price : a.price - b.price;
                                })
                                .map((k) => {
                                    const trade = activeTrades[k];
                                    return renderRow(trade, actionForTrade(trade));
                                }),
                        ])
                    ),
                    m(
                        ".box.pointer.text-m.uppercase.blue",
                        { onclick: () => routeTo("/player-trade-history") },
                        t("PlayerTradesShowHistory")
                    ),
                ]),
            ]);
        },
    };

    function actionForMyTrade(trade: ILocalTrade): m.Children {
        if (G.socket.myTrades[trade.id]) {
            if (trade.status === "open") {
                return m(
                    ".pointer",
                    {
                        onclick: async () => {
                            G.audio.playClick();
                            showAlert(t("PlayerTradeCancelTitle"), t("PlayerTradeCancelDescV2"), [
                                {
                                    name: t("PlayerTradeCancelNo"),
                                    class: "outline",
                                },
                                {
                                    name: t("PlayerTradeCancelYes"),
                                    class: "outline",
                                    action: async () => {
                                        try {
                                            console.log(trade);
                                            G.audio.playClick();
                                            await cancelTrade(trade);
                                            showToast(t("CancelTradeSuccess"));
                                            m.redraw();
                                        } catch (err) {
                                            G.audio.playError();
                                            showToast(err?.message);
                                        } finally {
                                            hideAlert();
                                        }
                                    },
                                },
                            ]);
                        },
                    },
                    [
                        m(".text-m.red", t("CancelTrade")),
                        m(
                            ".text-s.text-desc",
                            trade.side === "sell"
                                ? `${truncate(RES[trade.resource].name(), 10, 5)} +${nf(trade.amount * REFUND_PERCENT)}`
                                : `${RES.Cash.name()} +${nf(trade.amount * trade.price)}`
                        ),
                    ]
                );
            }
            return m(
                ".pointer.blue",
                {
                    onclick: claimTradeUI.bind(null, trade),
                },
                [
                    m(".text-m", t("ClaimTrade")),
                    m(
                        ".text-s.text-desc",
                        trade.side === "sell"
                            ? `${RES.Cash.name()} +${nf(trade.amount * trade.price)}`
                            : `${truncate(RES[trade.resource].name(), 10, 5)} +${nf(trade.amount)}`
                    ),
                ]
            );
        }
        return null;
    }

    function actionForTrade(trade: ITrade): m.Children {
        return m(
            ".pointer",
            {
                onclick: () => {
                    G.audio.playClick();
                    const rateLimitInSeconds = hasAnyDlc() ? 5 : 10;
                    if (serverNow() - lastAcceptTradeAt < rateLimitInSeconds * SECOND) {
                        G.audio.playError();
                        showToast(
                            t("AcceptTradeFailRateLimit", {
                                time: rateLimitInSeconds,
                            })
                        );
                        return;
                    }
                    let maxAmount =
                        trade.side === "sell"
                            ? Math.min(getCash() / trade.price, trade.amount)
                            : Math.min(T.usableRes[trade.resource], trade.amount);
                    maxAmount = Math.floor(maxAmount);
                    if (maxAmount < 1) {
                        G.audio.playError();
                        showToast(trade.side === "sell" ? t("NotEnoughCash") : t("NotEnoughResources"));
                        return;
                    }
                    showFillAlert(
                        {
                            ...trade,
                            amount: cc.misc.clampf(
                                taxCalculation(trade).totalTaxCreditAvailable / trade.price,
                                1,
                                maxAmount
                            ),
                        },
                        maxAmount
                    );
                },
            },
            [
                m(".blue.text-m", trade.side === "sell" ? t("PlayerTradeBuy") : t("PlayerTradeSell")),
                m(
                    ".text-s.text-desc",
                    trade.side === "sell"
                        ? `${truncate(RES[trade.resource].name(), 10, 5)} +${nf(trade.amount)}`
                        : `${RES.Cash.name()} +${nf(trade.amount * trade.price)}`
                ),
            ]
        );
    }

    function showFillAlert(trade: ITrade, maxAmount: number) {
        const c = taxCalculation(trade);
        showAlert(
            t("PlayerTradePartialFillTitle"),
            [
                m(".two-col.darkgrey", [
                    m(
                        "div",
                        `${RES[trade.resource].name()}: $${nf(trade.price)} x ${nf(trade.amount)} (${formatPercent(
                            trade.amount / maxAmount
                        )})`
                    ),
                    m(
                        "div",
                        t("PlayerTradeYouHave", {
                            amount: nf(T.usableRes[trade.resource]),
                        })
                    ),
                ]),
                m(".sep5"),
                m("input.block", {
                    type: "range",
                    min: 0.01,
                    max: 100,
                    step: 0.01,
                    oninput: (e) => {
                        trade.amount = Math.floor((maxAmount * e.target.value) / 100);
                        showFillAlert(trade, maxAmount);
                    },
                    value: Math.round((100 * trade.amount) / maxAmount),
                }),
                m(".sep5"),
                m(
                    ".text-center.blue.pointer",
                    {
                        onclick: () => {
                            trade.amount = cc.misc.clampf(c.totalTaxCreditAvailable / trade.price, 1, maxAmount);
                            showFillAlert(trade, maxAmount);
                        },
                    },
                    t("PlayerTradeMaxTaxCreditValue")
                ),
                m(".sep5"),
                m(".two-col.darkgrey", [
                    m("div", t("PlayerTradeGrossTradeValue")),
                    m("div", "$" + nf(c.valueBeforeTax)),
                ]),
                m(".sep5"),
                m(".two-col.text-m", [
                    m("div", t("PlayerTradeTaxCreditProduction")),
                    m(".green", "-$" + nf(c.taxCreditProductionAvailable)),
                ]),
                m(".two-col.text-m", [
                    m("div", t("PlayerTradeTaxCreditMarketCap")),
                    m(".green", "-$" + nf(c.taxCreditMarketCapAvailable)),
                ]),
                m(".two-col.text-m", [m("div", t("PlayerTradeTaxableValue")), m("div", "$" + nf(c.taxableValue))]),
                m(".two-col.text-m", [m("div", t("PlayerTradeTaxRate")), m("div", formatPercentPrecise(c.taxRate, 4))]),
                m(".sep5"),
                m(".two-col.red", [
                    m("div", t("PlayerTradeTaxPayable")),
                    m("div", [
                        m(
                            "div",
                            `$${nf(c.taxPayable)} (${nf(c.taxPayableInAmount)}, ${formatPercent(c.taxRateApplied)})`
                        ),
                    ]),
                ]),
                m(".sep5"),
                m(".two-col.darkgrey", [
                    m("div", t("PlayerTradeTradeValueAfterTax")),
                    m("div", `$${nf(c.valueAfterTax)} (${nf(c.amountAfterTax)})`),
                ]),
            ],
            [
                { name: t("Cancel"), class: "outline" },
                {
                    name: t("OK"),
                    class: "outline",
                    action: async () => {
                        try {
                            await acceptTrade(trade);
                            lastAcceptTradeAt = serverNow();
                            G.audio.playKaching();
                            showToast(
                                t("AcceptTradeSuccessV2", {
                                    cashOrResource:
                                        trade.side === "sell"
                                            ? `${RES[trade.resource].name()} +${nf(trade.amount)}`
                                            : `${RES.Cash.name()} +${nf(trade.amount * trade.price)}`,
                                })
                            );
                            hideAlert();
                            m.redraw();
                        } catch (error) {
                            G.audio.playError();
                            showToast(error?.message);
                        }
                    },
                },
            ]
        );
    }

    function renderRow(trade: ITrade, action: m.Children): m.Children {
        const playerName = G.socket.myTrades[trade.id] ? trade.fillBy || t("PlayerTradeWaiting") : trade.from;
        return m(
            "tr",
            {
                key: trade.id,
                class: G.socket.myTrades[trade.id] ? "my-trade" : "",
            },
            [
                m(
                    "td",
                    {
                        onclick: () => {
                            if (CC_DEBUG) {
                                cc.log(trade);
                            }
                        },
                    },
                    [
                        m("div", RES[trade.resource].name()),
                        m(".text-s.text-desc", [
                            trade.side === "buy"
                                ? m("span.red", t("PlayerTradeBid"))
                                : m("span.green", t("PlayerTradeAsk")),
                            " · ",
                            m("span", { title: playerName }, truncate(playerName, 12, 6)),
                            ifTrue(G.socket.isMod && trade.status === "open", () => {
                                return [
                                    " · ",
                                    m(
                                        "span.red.pointer.text-s",
                                        {
                                            onclick: () => {
                                                showAlert(
                                                    `Remove ${trade.from}'s Trade as Mod?`,
                                                    "This cannot be undone. Please only remove a trade that is very suspicious",
                                                    [
                                                        {
                                                            name: "Do Not Remove",
                                                            action: hideAlert,
                                                            class: "outline",
                                                        },
                                                        {
                                                            name: "Remove Trade",
                                                            async action() {
                                                                const r = await removeTrade(trade.id);
                                                                if (r.status === 200) {
                                                                    showToast(
                                                                        `Successfully removed ${trade.from}'s trade`
                                                                    );
                                                                } else {
                                                                    showToast(
                                                                        `Failed to remove ${trade.from}'s trade: ${r.status} ${r.statusText}`
                                                                    );
                                                                }
                                                                hideAlert();
                                                            },
                                                            class: "outline",
                                                        },
                                                    ]
                                                );
                                            },
                                        },
                                        "Remove"
                                    ),
                                ];
                            }),
                        ]),
                    ]
                ),
                m("td.r"),
                m("td.r", [
                    m(".text-m", `$${nf(trade.price * trade.amount)}`),
                    m(".text-desc.text-s", [
                        m(
                            "span",
                            {
                                class: isBetterThanMarket(trade) ? "green" : "red",
                            },
                            `$${nf(trade.price)}`
                        ),
                        ` x ${nf(trade.amount)}`,
                    ]),
                ]),
                m("td.r", action),
            ]
        );
    }
}

function ShowTaxCalculation(): m.Comp<{
    resource: keyof Resources;
    amount: number;
    price: number;
}> {
    let show = false;
    return {
        view: (vnode) => {
            const attr = vnode.attrs;
            const c = taxCalculation(attr);
            return [
                m(".two-col", [m("div", t("PlayerTradeGrossTradeValue")), m("div", "$" + nf(c.valueBeforeTax))]),
                m(".hr"),
                ifTrue(show, () => [
                    m(".two-col.text-m", [
                        m("div", [
                            m("div", t("PlayerTradeTaxCreditProduction")),
                            m(
                                ".text-desc.text-s",
                                t("PlayerTradeTaxCreditProductionDescV2", {
                                    res: RES[attr.resource].name(),
                                    produced: nf(c.taxCreditProduction / attr.price),
                                    used: nf(c.taxCreditProductionUsed / attr.price),
                                })
                            ),
                        ]),
                        m(".ml10.green", "-$" + nf(c.taxCreditProductionAvailable)),
                    ]),
                    m(".hr.dashed"),
                    m(".two-col.text-m", [
                        m("div", [
                            m("div", t("PlayerTradeTaxCreditMarketCap")),
                            m(
                                ".text-desc.text-s",
                                t("PlayerTradeTaxCreditMarketCapDesc", {
                                    percentage: formatPercent(getMarketCapTaxCreditPercent()),
                                    total: "$" + nf(c.taxCreditMarketCap),
                                    used: "$" + nf(c.taxCreditMarketCapUsed),
                                })
                            ),
                        ]),
                        m(".ml10.green", "-$" + nf(c.taxCreditMarketCapAvailable)),
                    ]),
                    m(".hr.dashed"),
                    m(".two-col.text-m", [m("div", t("PlayerTradeTaxableValue")), m("div", "$" + nf(c.taxableValue))]),
                    m(".hr.dashed"),
                    m(".two-col.text-m", [
                        m("div", [
                            m("div", t("PlayerTradeTaxRate")),
                            m(".text-desc.text-s", t("PlayerTradeTaxRateDesc")),
                        ]),
                        m(".ml10", formatPercentPrecise(c.taxRate, 4)),
                    ]),
                    m(".hr"),
                ]),
                m(".two-col", [
                    m("div", [
                        m("div", t("PlayerTradeTaxPayable")),
                        m(
                            ".blue.text-s.pointer",
                            {
                                onclick: () => {
                                    show = !show;
                                    m.redraw();
                                },
                            },
                            show ? t("PlayerTradeHideTaxCalculation") : t("PlayerTradeShowTaxCalculation")
                        ),
                    ]),
                    m("div", [
                        m("div", `$${nf(c.taxPayable)} (${formatPercent(c.taxRateApplied)})`),
                        m(".text-s.text-desc", nf(c.taxPayableInAmount) + " " + RES[attr.resource].name()),
                    ]),
                ]),
            ];
        },
    };
}
