import { stringToGrid } from "../CoreGame/GridHelper";
import { findByType } from "../CoreGame/Logic/Find";
import { D, G, Languages } from "../General/GameData";
import { keysOf } from "../General/Helper";
import { t } from "../General/i18n";
import { leftOrRight } from "./UIHelper";
import { routeConfig, routeTo } from "./UISystem";

let index = 0;
let music = true;

export function FirstTimePage(): m.Comp {
    return {
        oninit: () => {
            index = 0;
            routeConfig.shouldChangeRoute = () => false;
        },
        view: () => {
            return m("div.modal", { class: leftOrRight() }, [
                m(".header", m(".title", t("Welcome"))),
                m("div.scrollable", m(tutorials[index])),
            ]);
        },
        onremove: () => {
            D.persisted.music = music;
            G.audio.syncMusicSetting();
        },
    };
}

const tutorials: m.Comp[] = [
    {
        view: () => {
            return m(".box.tutorial", [
                m(".two-col", [
                    m("div", m("div", t("Language"))),
                    m(
                        ".ml20",
                        m(
                            "select.text-m",
                            {
                                onchange: (e) => {
                                    D.persisted.language = e.target.value;
                                },
                            },
                            keysOf(Languages).map((k) =>
                                m(
                                    "option",
                                    {
                                        key: k,
                                        value: k,
                                        selected: D.persisted.language === k,
                                    },
                                    Languages[k].ThisLanguage
                                )
                            )
                        )
                    ),
                ]),
                m(".hr"),
                m.trust(t("Tutorial1")),
                m(".action", [m("div", { onclick: () => index++ }, t("NextTutorial"))]),
            ]);
        },
    },
    {
        oninit: () => {
            G.world.locate(stringToGrid(findByType("WindTurbine").grid), true);
        },
        view: () => {
            return m(".box.tutorial", [
                m.trust(t("Tutorial2")),
                m(".action", [m("div", { onclick: () => index++ }, t("NextTutorial"))]),
            ]);
        },
    },
    {
        oninit: () => {
            G.world.locate(stringToGrid(findByType("OilWell").grid), true);
        },
        view: () => {
            return m(".box.tutorial", [
                m.trust(t("Tutorial3")),
                m(".action", [m("div", { onclick: () => index++ }, t("NextTutorial"))]),
            ]);
        },
    },
    {
        oninit: () => {
            G.world.locate(stringToGrid(findByType("OilRefinery").grid), true);
        },
        view: () => {
            return m(".box.tutorial", [
                m.trust(t("Tutorial4P1")),
                m(".action", [m("div", { onclick: () => index++ }, t("NextTutorial"))]),
            ]);
        },
    },
    {
        oninit: () => {
            G.world.locate(stringToGrid(findByType("LogisticsDepartment").grid), true);
        },
        view: () => {
            return m(".box.tutorial", [
                m.trust(t("Tutorial4P2")),
                m(".action", [m("div", { onclick: () => index++ }, t("NextTutorial"))]),
            ]);
        },
    },
    {
        oninit: () => {
            G.world.locate(stringToGrid(findByType("TradeCenter").grid), true);
        },
        view: () => {
            return m(".box.tutorial", [
                m.trust(t("Tutorial5")),
                m(".action", [m("div", { onclick: () => index++ }, t("NextTutorial"))]),
            ]);
        },
    },
    {
        oninit: () => {
            G.world.locate(stringToGrid(findByType("StatisticsCenter").grid), true);
        },
        view: () => {
            return m(".box.tutorial", [
                m.trust(t("Tutorial5P2")),
                m(".action", [m("div", { onclick: () => index++ }, t("NextTutorial"))]),
            ]);
        },
    },
    {
        oninit: () => {
            G.world.locate(stringToGrid(findByType("ResearchLab").grid), true);
        },
        view: () => {
            return m(".box.tutorial", [
                m.trust(t("Tutorial6")),
                m(".action", [
                    m(
                        ".text-desc",
                        {
                            onclick: () => {
                                music = false;
                                routeConfig.shouldChangeRoute = () => true;
                                routeTo("/main");
                            },
                        },
                        t("WelcomePlayMuted")
                    ),
                    m(
                        "div",
                        {
                            onclick: () => {
                                music = true;
                                routeConfig.shouldChangeRoute = () => true;
                                routeTo("/main");
                            },
                        },
                        t("WelcomePlay")
                    ),
                ]),
            ]);
        },
    },
];
