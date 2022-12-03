import { COLORS } from "../CoreGame/ColorThemes";
import {
    clearTrades,
    D,
    FontSizeScalingOptions,
    G,
    GameData,
    hasAnyDlc,
    Languages,
    PanelPositionOptions,
    PortraitPanelHeightOptions,
    ResourceMovementOptions,
    saveData,
    saveDataOverride,
    ScrollSensitivity,
    ScrollSensitivityOptions,
    syncFPSSetting,
} from "../General/GameData";
import { ifTrue, keysOf, mapOf } from "../General/Helper";
import { t } from "../General/i18n";
import { isAndroid, isIOS, isSteam, NativeSdk, steamworks } from "../General/NativeSdk";
import { leftOrRight, iconB, reloadGame, saveAndQuit, uiBoxToggle, uiHeaderActionBack, uiBoxToggleContent } from "./UIHelper";
import { hideAlert, routeTo, showAlert, showLoader, showStandby, showToast } from "./UISystem";

export function SettingsPage(): m.Component {
    return {
        view: () => {
            return m("div.modal", { class: leftOrRight() }, [
                uiHeaderActionBack(t("GameSetting"), () => G.world.routeTo(G.headquarter.grid)),
                m(".scrollable", [
                    m(".box",
                        m(".title", t("GameSetting")),
                        m(".hr"),
                        m(".row.pointer", { onclick: () => routeTo("/display-settings") }, [
                            m(".f1", [m("div", t("GameSettingDisplay"))]),
                            m(".ml10.green", iconB("arrow_forward")),
                        ]),
                        m(".hr"),
                        m(".row.pointer", { onclick: () => routeTo("/audio-settings") }, [
                            m(".f1", [m("div", t("GameSettingAudio"))]),
                            m(".ml10.green", iconB("arrow_forward")),
                        ]),
                        m(".hr"),
                        m(".row.pointer", { onclick: () => routeTo("/gameplay-settings") }, [
                            m(".f1", [m("div", t("GameSettingGameplay"))]),
                            m(".ml10.green", iconB("arrow_forward")),
                        ]),
                        ifTrue(!isIOS() && !isAndroid(), () => [                   
                            m(".hr"),
                            m(".row.pointer", { onclick: () => routeTo("/input-settings") }, [
                                m(".f1", [m("div", t("GameSettingInput"))]),
                                m(".ml10.green", iconB("arrow_forward")),
                            ]),
                        ]),

                    ),
                    m(".box.gamesettings", [
                        m(".title", t("GameSettingGeneral")),
                            m(".hr"),
                            m(".two-col", [
                                m(
                                    "div",
                                    m("div", [
                                        m("div", t("Language")),
                                        m(
                                            ".pointer.text-desc.text-s.blue",
                                            {
                                                onclick: () =>
                                                    NativeSdk.openUrl("https://github.com/fishpondstudio/IndustryIdle-i18n"),
                                            },
                                            t("HelpTranslateTheGame")
                                        ),
                                    ])
                                ),
                                m(
                                    ".ml20",
                                    m(
                                        "select.text-m",
                                        {
                                            onchange: (e) => {
                                                D.persisted.language = e.target.value;
                                            },
                                        },
                                        keysOf(Languages)
                                            .sort()
                                            .map((k) =>
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
                        ifTrue(D.map === "Oslo", () => [
                            m(".hr"),
                            m(".two-col.pointer", { onclick: () => routeTo("/first-time") }, [
                                m("div", m("div", t("SeeTutorialAgain"))),
                                m(".ml20.blue", iconB("link", 30)),
                            ]),
                        ]),
                        m(".hr"),
                        m(
                            ".two-col.pointer",
                            {
                                onclick: () => NativeSdk.openUrl("https://steamcommunity.com/app/1574000/guides/"),
                            },
                            [
                                m("div", [m("div", t("ReadSteamGuideV2")), m(".text-desc.text-s", t("ReadSteamGuideV2Desc"))]),
                                m(".blue.ml20", iconB("link", 30)),
                            ]
                        ),
                 ]),
            ]);
        },
    };
}

export function standbyModeAvailable() {
    return isSteam() || CC_DEBUG;
}
