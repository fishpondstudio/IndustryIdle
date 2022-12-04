import { D, G } from "../General/GameData";
import { t } from "../General/i18n";
import { leftOrRight, uiBoxToggle, uiHeaderActionBack } from "./UIHelper";
import { routeTo } from "./UISystem";

export function AudioSettingsPage(): m.Component {
    return {
        view: () => {
            return m("div.modal", { class: leftOrRight() }, [
                uiHeaderActionBack(t("GameSettingAudio"), () => routeTo("/game-settings")),
                m(".scrollable", [
                    m(".box.gamesettings", [
                        m(".title", t("GameSettingAudio")),
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
                 ]),
            ]);
        },
    };
}