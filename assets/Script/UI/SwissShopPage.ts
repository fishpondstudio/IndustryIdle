import { hasPendingCrowdfunding } from "../CoreGame/Logic/Crowdfunding";
import {
    BLD,
    getMarketCap,
    getPrestigeCurrency,
    getValuation,
    getWeeklyFreeCity,
    MAP,
    minMarketCapForPrestige,
    RES,
} from "../CoreGame/Logic/Logic";
import { depositsToPercentage, getRandomIslandBonusBuildings, Maps } from "../CoreGame/MapDefinitions";
import { SCENES } from "../General/Constants";
import { D, G } from "../General/GameData";
import { formatHM, formatPercent, getResourceUrl, HOUR, ifTrue, keysOf, nf } from "../General/Helper";
import { t } from "../General/i18n";
import { CrazyGameAdBanner } from "./CrazyGameAdBanner";
import { iconB, leftOrRight, progressBarWithLabel, switchScene, uiHeaderRoute, uiSwissMoneyBlock } from "./UIHelper";
import { routeTo } from "./UISystem";

export function SwissShopPage(): m.Comp {
    return {
        view: () => {
            const map = MAP[D.map];
            const marketCap = getMarketCap();
            const minMarketCap = minMarketCapForPrestige();
            const prestigeCurrency = getPrestigeCurrency(marketCap);
            const timePlayed = Date.now() - D.mapCreatedAt;
            const activeMinutesPlayed = D.tickCount / 60;
            const freeCity = getWeeklyFreeCity();

            return m("div.modal", { class: leftOrRight() }, [
                uiHeaderRoute(t("SwissShop"), "/main"),
                m("div.scrollable", [
                    m(CrazyGameAdBanner),
                    m(".box", [
                        m(".title", t("SwissBank")),
                        m(".hr"),
                        uiSwissMoneyBlock(),
                        m(".hr"),
                        m(".two-col", [
                            m("div", [m("div", t("CurrentCity")), m(".text-s.text-desc.mt5", getMapBonus(D.map))]),
                            m(".ml20", ["📍", map.name()]),
                        ]),
                        m(".hr"),
                        m(".two-col", [
                            m("div", [
                                m("div", t("CashIn")),
                                m(
                                    ".text-desc.text-s",
                                    t("CashInDesc", {
                                        amount: nf(minMarketCap),
                                    })
                                ),
                            ]),
                            m("div", [
                                m(
                                    ".ml20.blue.nobreak",
                                    t("SwissMoney", {
                                        money: nf(prestigeCurrency),
                                    })
                                ),
                                ifTrue(prestigeCurrency > 1000, () =>
                                    m(".text-desc.text-s", Math.floor(prestigeCurrency).toLocaleString())
                                ),
                            ]),
                        ]),
                        ifTrue(marketCap < minMarketCap, () =>
                            m("div", [m(".sep5"), progressBarWithLabel(t("MarketCap"), marketCap, minMarketCap)])
                        ),
                        m(".hr"),
                        m(".two-col.text-m", [m("div", m("div", t("TimePlayed"))), m(".ml20", formatHM(timePlayed))]),
                        ifTrue(timePlayed >= HOUR, () => [
                            m(".hr"),
                            m(".two-col.text-m", [
                                m("div", m("div", t("ValuationPerHour"))),
                                m(".ml20", nf(getValuation() / (timePlayed / HOUR))),
                            ]),
                        ]),
                        ifTrue(activeMinutesPlayed >= 5, () => [
                            m(".hr"),
                            m(".two-col.text-m", [
                                m("div", m("div", t("ValuationPerActiveMinute"))),
                                m(".ml20", nf(getValuation() / activeMinutesPlayed)),
                            ]),
                        ]),
                    ]),
                    ifTrue(D.isFirstSession, () => m(".box.banner.blue.text-m", t("RestartDesc"))),
                    ifTrue(hasPendingCrowdfunding(), () => m(".box.banner.text-m", t("CrowdfundingCashInWarning"))),
                    m(".box.banner.blue.text-m", t("FreeWeeklyCityDesc", { city: MAP[freeCity].name() })),
                    m(
                        ".new-city.pointer",
                        {
                            onclick: async () => {
                                G.audio.playClick();
                                switchScene(SCENES.World);
                            },
                        },
                        [
                            m("img", {
                                src: getResourceUrl("images/StartInANewCity.png"),
                            }),
                            m("div", [m("div", t("StartInANewCity")), m(".text-s", t("StartInANewCityFinePrint"))]),
                        ]
                    ),
                    m(".box", [
                        m(
                            ".two-col.pointer",
                            {
                                onclick: () => routeTo("/swiss-upgrade"),
                            },
                            [
                                m(
                                    "div",
                                    m("div", [
                                        m("div", t("SwissUpgrade")),
                                        m(".text-desc.text-s", t("SwissUpgradeDesc")),
                                    ])
                                ),
                                m(".ml20.blue", iconB("arrow_forward", 30)),
                            ]
                        ),
                        m(".hr"),
                        m(
                            ".two-col.pointer",
                            {
                                onclick: () => routeTo("/swiss-boost"),
                            },
                            [
                                m(
                                    "div",
                                    m("div", [m("div", t("SwissBoost")), m(".text-desc.text-s", t("SwissBoostDesc"))])
                                ),
                                m(".ml20.blue", iconB("arrow_forward", 30)),
                            ]
                        ),
                    ]),
                ]),
            ]);
        },
    };
}

function getMapBonus(map: keyof Maps): m.Children {
    if (map === "RandomIsland") {
        const buildings = getRandomIslandBonusBuildings();
        const percentage = depositsToPercentage(MAP[map].deposits);
        return [
            m("li.orange", t("RandomIslandBonusDesc")),
            buildings.map((b, i) => {
                if (i <= 1) {
                    return m(
                        "li",
                        t("RandomIslandBonusCapacity", {
                            building: BLD[b].name(),
                            multiplier: 2,
                        })
                    );
                }
                return m(
                    "li",
                    t("RandomIslandBonusProductivity", {
                        building: BLD[b].name(),
                        multiplier: 2,
                    })
                );
            }),
            m(
                "li",
                t("RandomIslandBonusResources", {
                    deposits: keysOf(percentage)
                        .map((k) => `${RES[k].name()} (${formatPercent(percentage[k])})`)
                        .join(", "),
                })
            ),
        ];
    }
    return m.trust(MAP[D.map].bonus());
}
