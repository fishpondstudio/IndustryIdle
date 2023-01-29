import { getPrestigeCurrency, MAP, prestige, RES } from "../CoreGame/Logic/Logic";
import { hasActiveTrades } from "../CoreGame/Logic/PlayerTrade";
import { depositsToPercentage } from "../CoreGame/MapDefinitions";
import { dlcDesc, dlcLabel, G, hasDLC } from "../General/GameData";
import { formatPercent, getResourceUrl, keysOf, nf } from "../General/Helper";
import { t } from "../General/i18n";
import { iconB, leftOrRight } from "./UIHelper";
import { hideAlert, hideLoader, routeTo, showAlert, showLoader, showToast } from "./UISystem";

export function CityPage(): m.Comp<{ city: string }> {
    let inProgress = false;
    return {
        view: (vnode) => {
            const key = vnode.attrs.city as keyof typeof MAP;
            const city = MAP[key];
            if (!city) {
                return null;
            }
            const depositsPercentage = depositsToPercentage(city.deposits);
            const prestigeCurrency = getPrestigeCurrency();
            let action = m(
                ".action.orange",
                {
                    onclick: () => {
                        G.audio.playError();
                        showToast(dlcDesc(city.dlc));
                    },
                },
                m("div", [iconB("lock", 24, 5), dlcLabel(city.dlc)])
            );
            if (hasDLC(city.dlc)) {
                action = m(".action.filled", [
                    m(
                        "div",
                        {
                            onclick: () => {
                                if (hasActiveTrades()) {
                                    showToast(t("CancelActiveTradeFirst"));
                                    return;
                                }
                                showAlert(
                                    t("PrestigeAlertTitle"),
                                    t("PrestigeAlertContent", {
                                        city: city.name(),
                                        amount: nf(prestigeCurrency),
                                    }),
                                    [
                                        { name: t("Cancel"), class: "outline" },
                                        {
                                            name: t("Prestige"),
                                            class: "red outline",
                                            action: async () => {
                                                try {
                                                    if (inProgress) {
                                                        return;
                                                    }
                                                    inProgress = true;
                                                    hideAlert();
                                                    showLoader();
                                                    await prestige(key, prestigeCurrency);
                                                    window.location.reload();
                                                } catch (error) {
                                                    G.audio.playError();
                                                    hideLoader();
                                                    inProgress = false;
                                                    showToast(error?.message);
                                                }
                                            },
                                        },
                                    ]
                                );
                            },
                        },
                        t("StartInThisCity", { city: city.name() })
                    ),
                ]);
            }
            if (key === "RandomIsland") {
                return m("div.modal", { class: leftOrRight() }, [
                    m("div.scrollable", [
                        m(".city-name", [
                            m("img", {
                                src: getResourceUrl(`/images/${key}.png`),
                            }),
                            m(".name", city.name()),
                            m(".close.mi", {
                                "data-shortcut": "escape",
                                onclick: () => routeTo("/main"),
                            }),
                        ]),
                        m(".box", [m(".title", t("CityBonus")), m(".city-bonus", m.trust(city.bonus())), action]),
                    ]),
                ]);
            }
            return m("div.modal", { class: leftOrRight() }, [
                m("div.scrollable", [
                    m(".city-name", [
                        m("img", {
                            src: getResourceUrl(`/images/${key}.png`),
                        }),
                        m(".name", city.name()),
                        m(".close.mi", {
                            "data-shortcut": "escape",
                            onclick: () => routeTo("/main"),
                        }),
                    ]),
                    m(".box", [
                        m(".two-col", [m("div", t("CitySize")), m("div", `${city.size}x${city.size}`)]),
                        m(".hr"),
                        m(".two-col", [
                            m("div", t("GridType")),
                            m("div", city.gridType === "square" ? t("MapSquareGrid") : t("MapHexGrid")),
                        ]),
                        m(".hr"),
                        m(".two-col", [
                            m("div", t("ResourceTilePercentage")),
                            m("div", formatPercent(city.resourceProbability)),
                        ]),
                        action,
                    ]),
                    m(".box", [
                        m(".title", t("Resources")),
                        keysOf(depositsPercentage).map((e) => {
                            return [
                                m(".hr"),
                                m(".two-col", [
                                    m("div", RES[e].name()),
                                    m(".ml20", formatPercent(depositsPercentage[e])),
                                ]),
                            ];
                        }),
                    ]),
                    m(".box", [
                        m(".title", t("Crop")),
                        keysOf(city.crops).map((e) => {
                            return [m(".hr"), m("div", RES[e].name())];
                        }),
                    ]),
                    m(".box", [m(".title", t("CityBonus")), m(".city-bonus", m.trust(city.bonus()))]),
                ]),
            ]);
        },
    };
}
