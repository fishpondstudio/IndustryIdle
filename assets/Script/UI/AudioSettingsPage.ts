import { D, G } from "../General/GameData";
import { ifTrue } from "../General/Helper";
import { t } from "../General/i18n";
import { leftOrRight, uiBoxToggle, uiBoxToggleContent, uiBoxRangeSlider, uiHeaderActionBack } from "./UIHelper";
import { routeTo } from "./UISystem";

export function AudioSettingsPage(): m.Component {
    return {
        view: () => {
            return m("div.modal", { class: leftOrRight() }, [
                uiHeaderActionBack(t("GameSettingAudio"), () => routeTo("/settings")),
                m(".scrollable", [
                    m(".box.audiosettings", [
                        m(".title", t("GameSettingGeneral")),
                            m(".hr"),
                            uiBoxToggle(t("Music"), t("MusicDesc"), D.persisted.music, () => {
                                G.audio.playClick();
                                D.persisted.music = !D.persisted.music;
                                G.audio.syncMusicSetting();
                            }),
                            m(".hr"),
                            uiBoxToggle(t("Sound"), t("SoundDesc"), D.persisted.sound, () => {
                                D.persisted.sound = !D.persisted.sound;
                                G.audio.playClick();
                            }),
                            m(".sep10"),
                            uiBoxToggleContent(
                                m(".text-s.uppercase", t("GameSettingSFXEnableOverride")),
                                D.persisted.isSFXVolumeOverride,
                                () => {
                                    D.persisted.isSFXVolumeOverride = !D.persisted.isSFXVolumeOverride;
                                },
                                { style: "margin: -10px 0" },
                                24
                            ),
                    ]),
                    m(".box.volume", [
                        m(".title", t("GameSettingVolumeControl")),
                            m(".hr"),
                            uiBoxRangeSlider(
                                t("GameSettingMusicVolume"), 
                                t("GameSettingMusicVolumeDesc"),
                                "musicVolumeSilder",
                                (D.persisted.musicVolume * 100),
                                0,
                                100,
                                1, 
                                (e) => {
                                    D.persisted.musicVolume = (e.currentTarget.value * 0.01);
                                    G.audio.syncMusicSetting();
                                }
                            ),
                            m(".hr"),
                            uiBoxRangeSlider(
                                t("GameSettingSFXVolume"), 
                                t("GameSettingSFXVolumeDesc"),
                                "sfxVolumeSilder",
                                (D.persisted.sfxVolume * 100), 
                                0,
                                100,
                                1
                            ),
                            ifTrue(D.persisted.isSFXVolumeOverride, () => [
                                m(".hr"),
                                uiBoxRangeSlider(
                                    t("GameSettingSFXBubble"), 
                                    null,
                                    "bubbleVolumeSilder",
                                    (D.persisted.sfxBubbleVolume * 100), 
                                    0,
                                    100,
                                    1
                                ),
                                m(".hr"),
                                uiBoxRangeSlider(
                                    t("GameSettingSFXClick"),
                                    null, 
                                    "clickVolumeSilder", 
                                    (D.persisted.sfxClickVolume * 100),
                                    0,
                                    100,
                                    1
                                ),
                                m(".hr"),
                                uiBoxRangeSlider(
                                    t("GameSettingSFXError"), 
                                    null,
                                    "errorVolumeSilder",
                                    (D.persisted.sfxErrorVolume * 100),
                                    0,
                                    100,
                                    1
                                ),
                                m(".hr"),
                                uiBoxRangeSlider(
                                    t("GameSettingSFXGold"), 
                                    null,
                                    "goldVolumeSilder",
                                    (D.persisted.sfxGoldVolume * 100), 
                                    0, 
                                    100,
                                    1 
                                ),
                                m(".hr"),
                                uiBoxRangeSlider(
                                    t("GameSettingSFXPowerup"), 
                                    null,
                                    "powerupVolumeSilder", 
                                    (D.persisted.sfxPowerupVolume * 100), 
                                    0, 
                                    100,
                                    1 
                                ),
                                m(".hr"),
                                uiBoxRangeSlider(
                                    t("GameSettingSFXKaching"), 
                                    null,
                                    "kachingVolumeSilder",
                                    (D.persisted.sfxKachingVolume * 100), 
                                    0, 
                                    100,
                                    1 
                                ),
                            ]),

                        ]),
                ]);
        },
    };
}