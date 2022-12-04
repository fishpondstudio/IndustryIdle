import {
    clearTrades,
    D,
    G,
    GameData,
    PanelPositionOptions,
    PortraitPanelHeightOptions,
    ResourceMovementOptions,
    saveDataOverride,
} from "../General/GameData";
import { t } from "../General/i18n";
import { leftOrRight, reloadGame, uiBoxToggle, uiHeaderActionBack } from "./UIHelper";
import { routeTo, showAlert, showLoader } from "./UISystem";

export function GameplaySettingsPage(): m.Component {
    return {
        view: () => {
            return m("div.modal", { class: leftOrRight() }, [
                uiHeaderActionBack(t("GameSettingGameplay"), () => routeTo("/game-settings")),
                m(".scrollable", [
                    m(".box.gameplaysettings", [
                        m(".title", t("GameSettingGameplay")),
                        m(".hr"),
                        uiBoxToggle(
                            t("GameSettingBuildWarningPowerBank"),
                            t("GameSettingBuildWarningPowerBankDesc"),
                                D.persisted.disableBuildWarningPowerBank,
                                
                            () => {
                                G.audio.playClick();
                                D.persisted.disableBuildWarningPowerBank = !D.persisted.disableBuildWarningPowerBank;
                            }
                        ),
                        m(".hr"),
                        uiBoxToggle(
                            t("GameSettingBuildWarningResourceBooster"),
                            t("GameSettingBuildWarningResourceBoosterDesc"),
                                D.persisted.disableBuildWarningResourceBooster,
                                
                            () => {
                                G.audio.playClick();
                                D.persisted.disableBuildWarningResourceBooster = !D.persisted.disableBuildWarningResourceBooster;
                            }
                        ),
                        m(".hr"),
                        uiBoxToggle(t("PlayerTradeAutoClaim"), t("PlayerTradeAutoClaimDesc"), D.persisted.autoClaimTradeOrder, () => {
                            G.audio.playClick();
                            D.persisted.autoClaimTradeOrder = !D.persisted.autoClaimTradeOrder;
                        }),
                    ]),
                    m(".box.singleplayermode", [
                        m(".title", t("GameSettingSinglePlayerMode")),
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
                    ]),
            ]);
        },
    };
}