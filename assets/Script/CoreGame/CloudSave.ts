import { GAME_DATA_STEAM_CLOUD_KEY } from "../General/Constants";
import { D, G, GameData } from "../General/GameData";
import { uuidv4 } from "../General/Helper";
import { t } from "../General/i18n";
import { isSteam, steamworks } from "../General/NativeSdk";
import { showToast } from "../UI/UISystem";

const MAX_SAVE_COUNT = 5;
export async function safeSaveToSteamCloud() {
    if (isSteam()) {
        try {
            await saveToSteamCloud();
        } catch (error) {
            G.audio.playError();
            showToast(t("SteamAutoCloudBackupFailed", { error: error?.message }));
        }
    }
}

export async function saveToSteamCloud() {
    let data = [];
    try {
        const content = await steamworks.readTextFromFile(GAME_DATA_STEAM_CLOUD_KEY);
        const json = JSON.parse(content);
        if (Array.isArray(json)) {
            data = json;
        }
    } catch (err) {
        cc.error(err);
    }

    const d: GameData = JSON.parse(JSON.stringify(D));
    d.persisted.tradeToken = uuidv4();

    data.unshift(d);
    while (data.length > MAX_SAVE_COUNT) {
        data.pop();
    }
    await steamworks.saveTextToFile(GAME_DATA_STEAM_CLOUD_KEY, JSON.stringify(data));
}
