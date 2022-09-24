import { hasActiveTrades } from "../CoreGame/Logic/PlayerTrade";
import {
    clearTrades,
    containsDlc,
    D,
    decryptData,
    G,
    GameData,
    getCurrentVersion,
    refreshTradeToken,
    saveDataOverride,
    signAndEncryptData,
    verify,
} from "../General/GameData";
import { isEmbeddedIFrame, uuidv4, versionToNumber } from "../General/Helper";
import { t } from "../General/i18n";
import { NativeSdk } from "../General/NativeSdk";
import { iconB, reloadGame } from "./UIHelper";
import { hideLoader, showLoader, showToast } from "./UISystem";

export function ImportExportPanel(): m.Component {
    return {
        view: () => {
            // I am in an iframe
            if (isEmbeddedIFrame()) {
                return m(".box", [
                    m(
                        ".pointer.two-col",
                        {
                            onclick: () => {
                                window.open(window.location.href, "_blank");
                            },
                        },
                        [
                            m("div", [
                                m(".blue", t("ExternalManageYourSave")),
                                m(".text-desc.text-s", t("ExternalManageYourSaveDesc")),
                            ]),
                            iconB("open_in_new", 24, 0, {}, { class: "blue ml10" }),
                        ]
                    ),
                ]);
            }
            const suggestedName = `Industry-Idle-Save-${D.persisted.userName}-${Math.floor(Date.now() / 1000)}`;
            return m(".box", [
                m(
                    ".pointer",
                    {
                        onclick: async () => {
                            try {
                                G.audio.playClick();
                                await NativeSdk.saveFile(suggestedName, await exportSave(false));
                            } catch (error) {
                                G.audio.playError();
                                showToast(String(error), 5000);
                            }
                        },
                    },
                    [m(".blue", t("ExportSaveForBackup")), m(".text-desc.text-s", t("ExportSaveForBackupDesc"))]
                ),
                m(".hr"),
                m(
                    ".pointer",
                    {
                        onclick: async () => {
                            try {
                                G.audio.playClick();
                                await NativeSdk.saveFile(suggestedName, await exportSave(true));
                                D.persisted.tradeToken = uuidv4();
                                G.socket.disconnect();
                                await G.socket.connect();
                            } catch (error) {
                                G.audio.playError();
                                showToast(String(error), 5000);
                            }
                        },
                    },
                    [m(".blue", t("ExportSaveForTransfer")), m(".text-desc.text-s", t("ExportSaveForTransferDesc"))]
                ),
                m(".hr"),
                m(
                    ".blue.pointer",
                    {
                        onclick: async () => {
                            try {
                                try {
                                    if (hasActiveTrades()) {
                                        throw new Error(t("CancelActiveTradeFirst"));
                                    }
                                    const save = await NativeSdk.readFile();
                                    showLoader();
                                    await importSave(save);
                                } catch (error) {
                                    hideLoader();
                                    G.audio.playError();
                                    showToast(t("FailedToImportSave") + " - " + String(error), 5000);
                                }
                            } catch (error) {
                                G.audio.playError();
                                showToast(String(error));
                            }
                        },
                    },
                    t("ImportSave")
                ),
            ]);
        },
    };
}

export async function importSave(d: string): Promise<void> {
    const decrypted = decryptData<GameData>(d);
    if (!verify(decrypted)) {
        throw new Error(t("SaveFileCorrupted"));
    }
    const saveVersion = decrypted.persisted.version;
    const gameVersion = getCurrentVersion();
    if (versionToNumber(saveVersion) > versionToNumber(gameVersion)) {
        throw new Error(
            t("SaveVersionTooNew", {
                saveVersion,
                gameVersion,
            })
        );
    }
    if (!containsDlc(D.persisted.dlc, decrypted.persisted.dlc)) {
        throw new Error(t("ExpansionPackIncompatible"));
    }
    if (hasActiveTrades()) {
        throw new Error(t("CancelActiveTradeFirst"));
    }
    if (CC_DEBUG && window.confirm("Wipe User Info?")) {
        decrypted.persisted.userId = uuidv4();
        decrypted.persisted.userName = decrypted.persisted.userId.substr(0, 6).toUpperCase();
        decrypted.persisted.leaderboardOptOut = true;
    }
    if (!CC_DEBUG) {
        clearTrades(decrypted.persisted.userId);
    }
    const resp = await refreshTradeToken(decrypted.persisted.tradeToken);
    if (resp.status === 200) {
        const json = await resp.json();
        decrypted.persisted.tradeToken = json.token;
    } else {
        throw new Error(t("ImportSaveRestoreFail"));
    }
    await saveDataOverride(decrypted);
    reloadGame();
}

export async function exportSave(isTransfer: boolean): Promise<string> {
    if (hasActiveTrades()) {
        throw new Error(t("CancelActiveTradeFirst"));
    }
    const d: GameData = JSON.parse(JSON.stringify(D));

    if (CC_DEBUG) {
        d.persisted.version = "0.0.0";
        d.persisted.dlc = {};
    }
    if (isTransfer) {
        // Current save lost right to trade
        D.persisted.tradeToken = uuidv4();
    } else {
        // Exported save lost right to trade
        d.persisted.tradeToken = uuidv4();
    }
    const save = signAndEncryptData(d);
    return save;
}

export interface VerificationResult {
    authenticated: boolean;
    rightToTrade: boolean;
    rightToTradeCooldown: number;
    trusted: boolean;
    passAntiCheat: boolean;
}
