import { saveToSteamCloud } from "../CoreGame/CloudSave";
import { hasActiveTrades } from "../CoreGame/Logic/PlayerTrade";
import { GAME_DATA_STEAM_CLOUD_KEY } from "../General/Constants";
import { clearTrades, G, GameData, saveDataOverride } from "../General/GameData";
import { ifTrue } from "../General/Helper";
import { t } from "../General/i18n";
import { isSteam, steamworks } from "../General/NativeSdk";
import { hideLoader, showAlert, showLoader, showToast } from "./UISystem";

export function SteamBackupComponent(): m.Comp {
    let backups: GameData[] = [];
    let loading = false;
    return {
        oninit: async () => {
            try {
                await readCloudBackup();
            } catch (error) {
                G.audio.playError();
                showToast(t("SteamAutoCloudBackupFailed", { error: error?.message }));
            }
        },
        view: () => {
            return m(".box", { style: { display: isSteam() ? "block" : "none" } }, [
                m(".title", t("SteamAutoCloudBackup")),
                backups.map((b) => {
                    return [
                        m(".hr"),
                        m(
                            ".two-col.text-m.pointer",
                            {
                                onclick: async () => {
                                    try {
                                        G.audio.playClick();
                                        if (hasActiveTrades()) {
                                            throw new Error(t("CancelActiveTradeFirst"));
                                        }
                                        showAlert(t("RestoreFromBackupTitle"), t("RestoreFromBackupDesc"), [
                                            {
                                                name: t("RestoreBackup"),
                                                class: "outline red",
                                                action: async () => {
                                                    try {
                                                        showLoader();
                                                        await saveDataOverride(b);
                                                        clearTrades(b.persisted.userId);
                                                        window.location.reload();
                                                    } catch (error) {
                                                        showToast(t("RestoreFromBackupFail"));
                                                        hideLoader();
                                                    }
                                                },
                                            },
                                            {
                                                name: t("Cancel"),
                                                class: "outline",
                                            },
                                        ]);
                                    } catch (error) {
                                        G.audio.playError();
                                        showToast(error?.message);
                                    }
                                },
                            },
                            [
                                m(".text-desc", m("div", new Date(b.persisted.lastTickAt).toLocaleString())),
                                m(".blue.ml20", t("RestoreBackup")),
                            ]
                        ),
                    ];
                }),
                m(".hr"),
                m(".text-s.text-desc.condensed.banner.blue", t("SteamAutoCloudBackupDescV3")),
                m(".action", [
                    ifTrue(!loading, () =>
                        m(
                            "div",
                            {
                                onclick: async () => {
                                    try {
                                        loading = true;
                                        await saveToSteamCloud();
                                        await readCloudBackup();
                                    } catch (error) {
                                        G.audio.playError();
                                        showToast(t("SteamAutoCloudBackupFailed", { error: error?.message }));
                                    } finally {
                                        loading = false;
                                    }
                                },
                            },
                            t("SteamManualBackup")
                        )
                    ),
                    ifTrue(loading, () => m("div", t("UILoading"))),
                ]),
            ]);
        },
    };

    async function readCloudBackup() {
        const content = await steamworks.readTextFromFile(GAME_DATA_STEAM_CLOUD_KEY);
        const data = JSON.parse(content);
        if (Array.isArray(data)) {
            backups = data;
        }
    }
}
