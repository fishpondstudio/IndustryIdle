import {
    addCash,
    addResourceTo,
    allResourcesValue,
    offlineEarningPerMin,
    RES,
    stockRating,
} from "../CoreGame/Logic/Logic";
import { D, G, hasAnyDlc } from "../General/GameData";
import { findComponent, formatPercent, ifTrue, mapOf, MINUTE, nf, numberSign, sizeOf } from "../General/Helper";
import { t } from "../General/i18n";
import { isAndroid, isIOS, NativeSdk } from "../General/NativeSdk";
import { timeSynced } from "../General/ServerClock";
import GoldAnimation from "../MetaGame/GoldAnimation";
import { CrazyGameAdBanner } from "./CrazyGameAdBanner";
import { CrowdfundingPage } from "./CrowdfundingPage";
import { leftOrRight, uiHeaderRoute } from "./UIHelper";
import { hideLoader, showLoader, showToast } from "./UISystem";

export function CentralBankPage(): m.Comp {
    // let canShowAd = isIOS() || isAndroid();
    const canShowAd = true;
    return {
        view: () => {
            const entity = D.buildings[m.route.param("xy")];
            const rv = allResourcesValue();
            const v = D.cashSpent + rv;
            // NativeSdk.canShowRewardVideo().then((can) => (canShowAd = can));
            return m("div.modal", { class: leftOrRight() }, [
                uiHeaderRoute(t("CentralBank"), "/main"),
                m("div.scrollable", [
                    m(CrazyGameAdBanner),
                    m(
                        ".box.banner.text-m",
                        { style: { display: timeSynced() ? "none" : "block" } },
                        t("OfflineModeDesc")
                    ),
                    D.offlineEarnings.map((o, i) => {
                        const minutes = Math.floor((o.end - o.start) / MINUTE);
                        const effectiveMinutes = Math.min(minutes, D.persisted.offlineEarningMinutes);
                        return m(".box", [
                            m(".title", `${t("ClaimOfflineEarning")} #${i + 1}`),
                            m(".hr"),
                            m(".two-col", [
                                m("div", [
                                    m("div", t("OfflineTime")),
                                    m(
                                        ".text-desc.text-s",
                                        `${new Date(o.start).toLocaleString()} ~ ${new Date(o.end).toLocaleString()}`
                                    ),
                                ]),
                                m(".ml20.text-desc", t("Minutes", { time: nf(minutes) })),
                            ]),
                            m(".hr"),
                            m(".two-col", [
                                m(
                                    "div",
                                    m("div", [
                                        t("EffectiveTime"),
                                        m(
                                            ".text-desc.text-s",
                                            t("EffectiveTimeDesc", {
                                                time: D.persisted.offlineEarningMinutes,
                                            })
                                        ),
                                    ])
                                ),
                                m(".ml20.blue", t("Minutes", { time: nf(effectiveMinutes) })),
                            ]),
                            ifTrue(o.researchPoint > 0, () => [
                                m(".hr"),
                                m(".two-col", [
                                    m("div", t("OfflineResearchPoint")),
                                    m(".ml20.blue", "+" + nf(o.researchPoint)),
                                ]),
                            ]),
                            ifTrue(sizeOf(o.production) > 0, () => [
                                m(".hr"),
                                m("div", t("OfflineProduction")),
                                mapOf(o.production, (k, v) => {
                                    return [
                                        m(".sep5"),
                                        m(".two-col.text-s", [m("div", RES[k].name()), m(".ml20.green", "+" + nf(v))]),
                                    ];
                                }),
                            ]),
                            m(".hr"),
                            m(".two-col", [
                                m("div", t("EarningPerMinuteV2")),
                                m(
                                    ".ml20.blue",
                                    t("PerMin", {
                                        amount: "$" + nf(o.cashPerMinute),
                                    })
                                ),
                            ]),
                            ifTrue(isIOS() || isAndroid(), () => {
                                return [m(".hr"), m(".text-s.orange", t("MobileAdDLCOwner"))];
                            }),
                            m(".action.filled", [
                                m(
                                    "div",
                                    {
                                        onclick: () => {
                                            D.offlineEarnings = D.offlineEarnings.filter((oe) => oe !== o);
                                            findComponent(GoldAnimation).play(
                                                () => addCash((o.cashPerMinute * effectiveMinutes) / 10),
                                                10
                                            );
                                            addResourceTo(G.researchLab, "RP", o.researchPoint, false);
                                        },
                                    },
                                    t("ClaimAmount", {
                                        amount: nf(o.cashPerMinute * effectiveMinutes),
                                    })
                                ),
                                m(
                                    "div",
                                    {
                                        style: {
                                            display: !canShowAd || D.persisted.hideRewardAd ? "none" : "flex",
                                        },
                                        onclick: async () => {
                                            if (hasAnyDlc()) {
                                                doubleOfflineEarning();
                                                return;
                                            }
                                            const can = await NativeSdk.canShowRewardVideo();
                                            if (!can) {
                                                showToast(t("RewardAdsFailed"));
                                                return;
                                            }
                                            try {
                                                showLoader();
                                                await NativeSdk.showRewardVideo();
                                                hideLoader();
                                                doubleOfflineEarning();
                                            } catch (error) {
                                                hideLoader();
                                                showToast(t("RewardAdsFailed"));
                                            }

                                            function doubleOfflineEarning() {
                                                showToast(t("OfflineEarningDoubleSuccess"));
                                                D.offlineEarnings = D.offlineEarnings.filter((oe) => oe !== o);
                                                findComponent(GoldAnimation).play(
                                                    () => addCash((2 * o.cashPerMinute * effectiveMinutes) / 10),
                                                    10
                                                );
                                            }
                                        },
                                    },
                                    `${t("ClaimAmount", {
                                        amount: nf(2 * o.cashPerMinute * effectiveMinutes),
                                    })} 🎬`
                                ),
                            ]),
                        ]);
                    }),
                    m(CrowdfundingPage),
                    m(".box", [
                        m(".title", t("WallStreet")),
                        m(".hr"),
                        m(".two-col", [
                            m("div", [m("div", t("MarketCap")), m(".text-s.text-desc", t("MarketCapDesc"))]),
                            m(".ml20.text-desc", nf(v * D.stockRating)),
                        ]),
                        m(".hr"),
                        m(".two-col", [
                            m("div", [
                                m("div", t("BuildingValuation")),
                                m(".text-s.text-desc", t("BuildingValuationDesc")),
                            ]),
                            m(".ml20.text-desc", nf(D.cashSpent)),
                        ]),
                        m(".hr"),
                        m(".two-col", [
                            m("div", [
                                m("div", t("ResourcesValuation")),
                                m(".text-s.text-desc", t("ResourcesValuationDesc")),
                            ]),
                            m(".ml20.text-desc", nf(rv)),
                        ]),
                        m(".hr"),
                        m(".two-col", [
                            m("div", [m("div", t("StockRating")), m(".text-s.text-desc", t("StockRatingDesc"))]),
                            m(".ml20", { class: D.stockRating >= 1 ? "green" : "red" }, [
                                m("div", stockRating()),
                                m(
                                    ".text-s",
                                    numberSign(D.stockRating - 1) + formatPercent(Math.abs(D.stockRating - 1))
                                ),
                            ]),
                        ]),
                    ]),
                    m(".box", [
                        m(".title", t("OfflineEarning")),
                        m(".hr"),
                        m(".two-col", [
                            m("div", [
                                m("div", t("OfflineEarning")),
                                m(".text-s.text-desc", t("OfflineEarningDescV2")),
                            ]),
                            m(
                                ".ml20.text-desc",
                                t("PerMin", {
                                    amount: "$" + nf(offlineEarningPerMin()),
                                })
                            ),
                        ]),
                        m(".hr"),
                        m(".two-col", [
                            m("div", [
                                m("div", t("OfflineEarningTime")),
                                m(".text-s.text-desc", t("OfflineEarningTimeDesc")),
                            ]),
                            m(
                                ".ml20.text-desc",
                                t("Minutes", {
                                    time: nf(D.persisted.offlineEarningMinutes),
                                })
                            ),
                        ]),
                    ]),
                ]),
            ]);
        },
    };
}
