import { D, G, Languages } from "../General/GameData";
import { ifTrue, keysOf } from "../General/Helper";
import { t } from "../General/i18n";
import { NativeSdk } from "../General/NativeSdk";
import { leftOrRight, iconB, isMobile, uiBoxToggle, uiHeaderActionBack, uiBoxToggleContent, uiHotkey } from "./UIHelper";
import { routeTo } from "./UISystem";

export function SettingsPage(): m.Component {
    return {
        view: () => {
            return m("div.modal", { class: leftOrRight() }, [
                uiHeaderActionBack(t("GameSetting"), () => G.world.routeTo(G.headquarter.grid)),
                m(".scrollable", [
                    m(".box",
                        m(".title", t("GameSetting")),
                        m(".hr"),
                        m(".row.pointer", 
                            { 
                                "data-shortcut": "1-false-false-false", onclick: () => routeTo("/audio-settings") 
                            }, 
                            [
                                m(".f1", 
                                    m("div", [
                                        uiHotkey(
                                            {key: "1", ctrlKey: false, shiftKey: false, altKey: false},
                                            "",
                                            " ",
                                            D.persisted.hideHotkeySubmenuLabels
                                        ),
                                        t("GameSettingAudio")
                                    ])
                                ),
                                m(".ml10.blue", iconB("arrow_forward")),
                            ]
                        ),
                        m(".hr"),
                        m(".row.pointer", 
                            { 
                                "data-shortcut": "2-false-false-false", 
                                onclick: () => routeTo("/display-settings") 
                            }, 
                            [
                                m(".f1", 
                                    m("div", [
                                        uiHotkey(
                                            {key: "2", ctrlKey: false, shiftKey: false, altKey: false},
                                            "",
                                            " ",
                                            D.persisted.hideHotkeySubmenuLabels
                                        ),
                                        t("GameSettingDisplay")
                                    ])
                                ),
                                m(".ml10.blue", iconB("arrow_forward")),
                            ]
                        ),
                        m(".hr"),
                        m(".row.pointer", 
                            { 
                                "data-shortcut": "3-false-false-false", 
                                onclick: () => routeTo("/gameplay-settings") 
                            }, 
                            [
                                m(".f1", 
                                    m("div", [
                                        uiHotkey(
                                            {key: "3", ctrlKey: false, shiftKey: false, altKey: false},
                                             "",
                                             " ",
                                             D.persisted.hideHotkeySubmenuLabels
                                        ),
                                        t("GameSettingGameplay")
                                    ])
                                ),
                                m(".ml10.blue", iconB("arrow_forward")),
                            ]
                        ),
                        ifTrue(!isMobile(), () => [                   
                            m(".hr"),
                            m(".row.pointer", 
                                { 
                                    "data-shortcut": "4-false-false-false", 
                                    onclick: () => routeTo("/input-settings") 
                                }, 
                                [
                                    m(".f1", 
                                        m("div", [
                                            uiHotkey(
                                                {key: "4", ctrlKey: false, shiftKey: false, altKey: false},
                                                "",
                                                " ",
                                                D.persisted.hideHotkeySubmenuLabels
                                            ),
                                            t("GameSettingInput")
                                        ])
                                    ),
                                    m(".ml10.blue", iconB("arrow_forward")),
                                ]
                            ),
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
                        ifTrue(D.map === "Oslo", () => [
                            m(".hr"),
                            m(".two-col.pointer", { onclick: () => routeTo("/first-time") }, [
                                m("div", m("div", t("SeeTutorialAgain"))),
                                m(".ml20.blue", iconB("link", 30)),
                            ]),
                        ]),
                    ]),
                ]),
            ]);
        },
    };
}
