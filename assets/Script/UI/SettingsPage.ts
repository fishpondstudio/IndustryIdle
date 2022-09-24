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
import { iconB, reloadGame, saveAndQuit, uiBoxToggle, uiBoxToggleContent } from "./UIHelper";
import { hideAlert, routeTo, showAlert, showLoader, showStandby, showToast } from "./UISystem";

export function SettingsPage(): m.Comp {
    return {
        view: () => {
            return m(".box.settings", [
                m(".title", t("Settings")),
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
                uiBoxToggle(
                    t("UseScientificNotation"),
                    t("UseScientificNotationDesc"),
                    D.persisted.useScientificNotation,
                    () => {
                        G.audio.playClick();
                        D.persisted.useScientificNotation = !D.persisted.useScientificNotation;
                    }
                ),
                m(".hr"),
                uiBoxToggle(t("Sound"), t("SoundDesc"), D.persisted.sound, () => {
                    D.persisted.sound = !D.persisted.sound;
                    G.audio.playClick();
                }),
                m(".hr"),
                uiBoxToggle(t("Music"), t("MusicDesc"), D.persisted.music, () => {
                    G.audio.playClick();
                    D.persisted.music = !D.persisted.music;
                    G.audio.syncMusicSetting();
                }),
                m(".hr"),
                uiBoxToggle(t("FPS30"), t("FPS30Desc"), D.persisted.fps30, () => {
                    G.audio.playClick();
                    D.persisted.fps30 = !D.persisted.fps30;
                    syncFPSSetting();
                }),
                m(".hr"),
                uiBoxToggle(
                    t("YAxisStartsFromZero"),
                    t("YAxisStartsFromZeroDesc"),
                    D.persisted.yAxisStartsFromZero,
                    () => {
                        G.audio.playClick();
                        D.persisted.yAxisStartsFromZero = !D.persisted.yAxisStartsFromZero;
                    }
                ),
                m(".hr"),
                uiBoxToggle(t("ShowSupplyChain"), t("ShowSupplyChainDesc"), D.persisted.showSupplyChain, () => {
                    G.audio.playClick();
                    D.persisted.showSupplyChain = !D.persisted.showSupplyChain;
                }),
                ifTrue(isSteam(), () => [
                    m(".hr"),
                    uiBoxToggle(t("SettingsFullScreen"), t("SettingsFullScreenDesc"), D.persisted.fullscreen, () => {
                        D.persisted.fullscreen = !D.persisted.fullscreen;
                        steamworks.setFullScreen(D.persisted.fullscreen);
                    }),
                    m(".hr"),
                    m(".two-col", [
                        m("div", [m("div", t("SaveAndExit")), m(".text-desc.text-s", t("SaveAndExitDesc"))]),
                        m(
                            ".blue.ml20.pointer",
                            {
                                onclick: saveAndQuit,
                            },
                            iconB("exit_to_app", 30)
                        ),
                    ]),
                ]),
                ifTrue(standbyModeAvailable(), () => [
                    m(".hr"),
                    m(".two-col", [
                        m("div", [m("div", t("StandbyMode")), m(".text-desc.text-s", t("StandbyModeDesc"))]),
                        m(
                            ".blue.ml20.pointer",
                            {
                                onclick: showStandby,
                            },
                            iconB("mode_standby", 30)
                        ),
                    ]),
                    m(".sep10"),
                    uiBoxToggleContent(
                        m(".text-s.uppercase", t("SettingsShowInToolbar")),
                        D.persisted.showStandbyModeInToolbar,
                        () => {
                            D.persisted.showStandbyModeInToolbar = !D.persisted.showStandbyModeInToolbar;
                        },
                        { style: "margin: -10px 0" },
                        24
                    ),
                ]),
                m(".hr"),
                m(".two-col", [
                    m("div", [m("div", t("ResourceMovement")), m(".text-s.text-desc", t("ResourceMovementDesc"))]),
                    m(
                        ".ml20",
                        m(
                            "select.text-m",
                            {
                                onchange: (e) => {
                                    D.persisted.resourceMovement = e.target.value;
                                },
                            },
                            mapOf(ResourceMovementOptions, (key, label) =>
                                m(
                                    "option",
                                    {
                                        key: key,
                                        value: key,
                                        selected: D.persisted.resourceMovement === key,
                                    },
                                    label()
                                )
                            )
                        )
                    ),
                ]),
                ifTrue(hasAnyDlc(), () => [
                    m(".hr"),
                    uiBoxToggle(
                        t("HideRewardAd"),
                        [m("div", t("HideRewardAdDesc")), m(".orange", t("RequireAnyExpansionPack"))],
                        D.persisted.hideRewardAd,
                        () => {
                            if (hasAnyDlc()) {
                                G.audio.playClick();
                                D.persisted.hideRewardAd = !D.persisted.hideRewardAd;
                            } else {
                                G.audio.playError();
                                showToast(t("RequireAnyExpansionPackDesc"));
                            }
                        }
                    ),
                ]),
                ifTrue(hasAnyDlc(), () => [
                    m(".hr"),
                    uiBoxToggle(
                        t("HideDiscordBanner"),
                        [m("div", t("HideDiscordBannerDesc")), m(".orange", t("RequireAnyExpansionPack"))],
                        D.persisted.hideDiscordBanner,
                        () => {
                            if (hasAnyDlc()) {
                                G.audio.playClick();
                                D.persisted.hideDiscordBanner = !D.persisted.hideDiscordBanner;
                            } else {
                                G.audio.playError();
                                showToast(t("RequireAnyExpansionPackDesc"));
                            }
                        }
                    ),
                ]),
                m(".hr"),
                uiBoxToggle(
                    t("HideChat"),
                    [
                        t("HideChatDescV2"),
                        m(
                            "span.blue.pointer",
                            {
                                onclick: () => NativeSdk.openUrl("https://fishpondstudio.com/tos.txt"),
                            },
                            t("HideChatDescV2ToS")
                        ),
                    ],
                    D.persisted.hideChat,
                    () => {
                        G.audio.playClick();
                        D.persisted.hideChat = !D.persisted.hideChat;
                    }
                ),
                m(".hr"),
                uiBoxToggle(t("HideChatMentions"), t("HideChatMentionsDesc"), D.persisted.hideChatMentions, () => {
                    G.audio.playClick();
                    D.persisted.hideChatMentions = !D.persisted.hideChatMentions;
                }),
                m(".hr"),
                m(".two-col", [
                    m("div", [m("div", t("PanelPosition")), m(".text-s.text-desc", t("PanelPositionDescV2"))]),
                    m(
                        ".ml20",
                        m(
                            "select.text-m",
                            {
                                onchange: (e) => {
                                    D.persisted.panelPosition = e.target.value;
                                },
                            },
                            mapOf(PanelPositionOptions, (k, label) =>
                                m(
                                    "option",
                                    {
                                        key: k,
                                        value: k,
                                        selected: D.persisted.panelPosition === k,
                                    },
                                    label()
                                )
                            )
                        )
                    ),
                ]),
                m(".hr"),
                uiBoxToggle(t("AllowPortraitMode"), t("AllowPortraitModeDesc"), D.persisted.allowPortrait, async () => {
                    G.audio.playClick();
                    D.persisted.allowPortrait = !D.persisted.allowPortrait;
                    await saveData();
                    NativeSdk.allowPortrait(D.persisted.allowPortrait);
                }),
                m(".hr"),
                ifTrue(D.persisted.allowPortrait, () => [
                    m(".two-col", [
                        m("div", [m("div", t("PanelHeight")), m(".text-s.text-desc", t("PanelHeightDesc"))]),
                        m(
                            ".ml20",
                            m(
                                "select.text-m",
                                {
                                    onchange: async (e) => {
                                        showLoader();
                                        D.persisted.panelHeight = e.target.value;
                                        await saveData();
                                        reloadGame();
                                    },
                                },
                                mapOf(PortraitPanelHeightOptions, (k, label) =>
                                    m(
                                        "option",
                                        {
                                            key: k,
                                            value: k,
                                            selected: D.persisted.panelHeight === k,
                                        },
                                        label
                                    )
                                )
                            )
                        ),
                    ]),
                    m(".hr"),
                ]),
                m(".two-col", [
                    m(
                        "div",
                        m("div", [m("div", t("FontSizeScaling")), m(".text-desc.text-s", t("FontSizeScalingDesc"))])
                    ),
                    m(
                        ".ml20",
                        m(
                            "select.text-m",
                            {
                                onchange: async (e) => {
                                    G.audio.playClick();
                                    showLoader();
                                    D.persisted.fontSizeScaling = e.target.value;
                                    await saveData();
                                    reloadGame();
                                },
                            },
                            FontSizeScalingOptions.map((k) =>
                                m(
                                    "option",
                                    {
                                        key: k,
                                        value: k,
                                        selected: D.persisted.fontSizeScaling === k,
                                    },
                                    `${k}x`
                                )
                            )
                        )
                    ),
                ]),
                ifTrue(!isIOS() && !isAndroid(), () => [
                    m(".hr"),
                    m(".two-col", [
                        m(
                            "div",
                            m("div", [
                                m("div", t("MousewheelSensitivity")),
                                m(".text-desc.text-s", t("MousewheelSensitivityDesc")),
                            ])
                        ),
                        m(
                            ".ml20",
                            m(
                                "select.text-m",
                                {
                                    onchange: async (e) => {
                                        G.audio.playClick();
                                        D.persisted.scrollSensitivity = parseFloat(e.target.value) as ScrollSensitivity;
                                    },
                                },
                                ScrollSensitivityOptions.map((k) =>
                                    m(
                                        "option",
                                        {
                                            key: k,
                                            value: k,
                                            selected: D.persisted.scrollSensitivity === k,
                                        },
                                        `${k}x`
                                    )
                                )
                            )
                        ),
                    ]),
                ]),
                m(".hr"),
                m(".two-col", [
                    m("div", m("div", [m("div", t("ColorTheme")), m(".text-desc.text-s", t("ColorThemeDesc"))])),
                    m(
                        ".ml20",
                        m(
                            "select.text-m",
                            {
                                onchange: async (e) => {
                                    showLoader();
                                    D.persisted.colorTheme = e.target.value;
                                    await saveData();
                                    reloadGame();
                                },
                            },
                            keysOf(COLORS)
                                .filter((c) => (hasAnyDlc() ? true : !COLORS[c].dlc))
                                .map((k) =>
                                    m(
                                        "option",
                                        {
                                            key: k,
                                            value: k,
                                            selected: D.persisted.colorTheme === k,
                                        },
                                        COLORS[k].name
                                    )
                                )
                        )
                    ),
                ]),
                m(".hr"),
                m(
                    ".two-col.pointer",
                    {
                        onclick: () => routeTo("/color-theme-editor"),
                    },
                    [
                        m(
                            "div",
                            m("div", [
                                m("div", t("ColorThemeEditor")),
                                m(
                                    ".text-desc.text-s",
                                    t("ColorThemeEditorDesc", {
                                        num: Object.keys(D.persisted.colorThemeOverrides).length,
                                    })
                                ),
                            ])
                        ),
                        m(".ml20.blue", iconB("arrow_forward", 30)),
                    ]
                ),
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
                m(".hr"),
                uiBoxToggle(t("LeaderboardOptOut"), t("LeaderboardOptOutDescV2"), D.persisted.leaderboardOptOut, () => {
                    G.audio.playClick();
                    if (D.persisted.leaderboardOptOut) {
                        showAlert(t("LeaderboardOptIn"), t("LeaderboardOptInDesc"), [
                            {
                                class: "outline",
                                name: t("Cancel"),
                            },
                            {
                                class: "outline red",
                                name: t("OptIn"),
                                action: () => {
                                    G.audio.playClick();
                                    hideAlert();
                                    showLoader();
                                    clearTrades(D.persisted.userId);
                                    saveDataOverride(new GameData()).then(() => reloadGame());
                                },
                            },
                        ]);
                    } else {
                        showAlert(t("LeaderboardOptOut"), t("LeaderboardOptOutDescV2"), [
                            {
                                class: "outline",
                                name: t("Cancel"),
                            },
                            {
                                class: "outline red",
                                name: t("OptOut"),
                                action: () => {
                                    G.audio.playClick();
                                    clearTrades(D.persisted.userId);
                                    D.persisted.leaderboardOptOut = !D.persisted.leaderboardOptOut;
                                    hideAlert();
                                },
                            },
                        ]);
                    }
                }),
            ]);
        },
    };
}

export function standbyModeAvailable() {
    return isSteam() || CC_DEBUG;
}
