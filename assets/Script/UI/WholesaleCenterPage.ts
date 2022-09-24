import {
    addCash,
    orderInterval,
    RES,
    resourcesBeingProduced,
    tryDeductResources,
    wholesaleCenterMinimumResources,
    wholesaleUnlocked,
} from "../CoreGame/Logic/Logic";
import { affectedByNews, getApplyToI18n, getApplyToIcon as getApplyToIconName } from "../CoreGame/MarketNews";
import { D, G, T } from "../General/GameData";
import { capitalize, formatHMS, formatPercent, ifTrue, keysOf, mapOf, nf, safeGet } from "../General/Helper";
import { t } from "../General/i18n";
import { serverNow } from "../General/ServerClock";
import { CrazyGameAdBanner } from "./CrazyGameAdBanner";
import { iconB, leftOrRight, progressBarWithLabel, uiHeaderRoute } from "./UIHelper";
import { showToast } from "./UISystem";

export function WholesaleCenterPage(): m.Comp {
    return {
        view: () => {
            const now = serverNow();
            const unlocked = wholesaleUnlocked();
            return m("div.modal", { class: leftOrRight() }, [
                uiHeaderRoute(t("WholesaleCenter"), "/main"),
                m("div.scrollable", [
                    m(CrazyGameAdBanner),
                    m(".box", [
                        m(".title", t("MarketNews")),
                        mapOf(D.marketNews, (res, n) => {
                            return [
                                m(".hr"),
                                m(
                                    ".text-m.row.pointer",
                                    {
                                        onclick: () => {
                                            G.audio.playClick();
                                            showToast(
                                                t("NBuildingsAreHighlighted", {
                                                    n: G.world.highlightBuildings((v) =>
                                                        affectedByNews(v.entity.type, n)
                                                    ),
                                                })
                                            );
                                        },
                                    },
                                    [
                                        iconB(getApplyToIconName(n.range), 24, 10, {}, { class: "blue" }),
                                        m(".f1", [
                                            m(
                                                "div",
                                                t(`MarketNewsFilter${capitalize(n.filter)}` as any, {
                                                    res: RES[res].name(),
                                                }),
                                                n.modifier > 0
                                                    ? t("MarketNewsIncrease", {
                                                          percent: formatPercent(n.modifier),
                                                      })
                                                    : t("MarketNewsDecrease", {
                                                          percent: formatPercent(-n.modifier),
                                                      })
                                            ),
                                            m(".two-col.text-s.text-desc.uppercase", [
                                                m("div", getApplyToI18n(n.range)),
                                                m("div", t("MarketNewsHighlightAffected")),
                                            ]),
                                        ]),
                                    ]
                                ),
                            ];
                        }),
                    ]),
                    ifTrue(!unlocked, () =>
                        m(".box.text-desc.text-center", [
                            iconB("lock", 50),
                            m(".sep10"),
                            t("WholesaleCenterLocked", {
                                required: wholesaleCenterMinimumResources(),
                                current: resourcesBeingProduced().length,
                            }),
                        ])
                    ),
                    ifTrue(unlocked, () => [
                        m(".box", [
                            m(".title.two-col", [
                                m("div", t("NextOrderIn")),
                                m("div", formatHMS(T.lastOrderAt + orderInterval() - now)),
                            ]),
                            m(".hr"),
                            m(
                                ".progress",
                                m(".fill", {
                                    style: {
                                        width: `${(100 * (now - T.lastOrderAt)) / orderInterval()}%`,
                                    },
                                })
                            ),
                        ]),
                        D.orders.map((o) => {
                            const reward = o.cashValue * (1 + o.markup);
                            return m(".box", [
                                m(".title", t("OrderFrom", { name: o.name })),
                                keysOf(o.resources).map((k) => {
                                    const youHave = safeGet(T.usableRes, k, 0);
                                    return [
                                        m(".hr"),
                                        progressBarWithLabel(
                                            [
                                                m("span", RES[k].name()),
                                                ifTrue(D.autoSellRes[k], () =>
                                                    m(
                                                        "span.ml5.text-desc.text-s.cursor-help",
                                                        {
                                                            title: t("AutoSellResourceWarningDesc"),
                                                        },
                                                        t("AutoSellResourceWarningShortLabel")
                                                    )
                                                ),
                                            ],
                                            youHave,
                                            o.resources[k]
                                        ),
                                    ];
                                }),
                                m(".hr"),
                                m(".title", t("Reward")),
                                m(".hr"),
                                m(".two-col", [m("div", t("Cash")), m(".green", ["+", nf(reward)])]),
                                m(".hr"),
                                m(".two-col", [m("div", t("PolicyPoint")), m(".green", ["+", nf(o.policyPoints)])]),
                                m(".hr"),
                                m(".two-col", [m("div", t("ResearchPoint")), m(".green", ["+", nf(o.researchPoints)])]),
                                m(".hr"),
                                m(".two-col", [
                                    m("div", m("div", t("ExpireIn"))),
                                    m(".text-desc", formatHMS(o.time + o.validFor - now)),
                                ]),
                                m(".action", [
                                    m(
                                        ".red",
                                        {
                                            onclick: () => {
                                                G.audio.playClick();
                                                D.orders = D.orders.filter((order) => order !== o);
                                            },
                                        },
                                        t("RejectOrder")
                                    ),
                                    m(
                                        ".blue",
                                        {
                                            onclick: () => {
                                                if (!D.orders.find((order) => o === order)) {
                                                    return;
                                                }
                                                if (tryDeductResources(o.resources)) {
                                                    G.audio.playEffect(G.audio.kaching);
                                                    addCash(reward);
                                                    G.policyCenter.resources.PP =
                                                        (G.policyCenter.resources.PP ?? 0) + o.policyPoints;
                                                    G.researchLab.resources.RP =
                                                        (G.researchLab.resources.RP ?? 0) + o.researchPoints;
                                                    D.orders = D.orders.filter((order) => order !== o);
                                                    showToast(
                                                        t("OrderFilled", {
                                                            from: o.name,
                                                        })
                                                    );
                                                } else {
                                                    G.audio.playError();
                                                    showToast(t("NotEnoughResources"));
                                                }
                                            },
                                        },
                                        t("FillOrder")
                                    ),
                                ]),
                            ]);
                        }),
                    ]),
                ]),
            ]);
        },
    };
}
