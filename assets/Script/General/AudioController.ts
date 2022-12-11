import { D } from "./GameData";
import { getDebugUrlParams } from "./Helper";

const { ccclass, property } = cc._decorator;

@ccclass
export class AudioController {
    public click: cc.AudioClip = null;
    public freechest: cc.AudioClip = null;
    public gold: cc.AudioClip = null;
    public error: cc.AudioClip = null;
    public kaching: cc.AudioClip = null;
    public levelup: cc.AudioClip = null;
    public powerup: cc.AudioClip = null;
    public bubble: cc.AudioClip = null;
    public completed: cc.AudioClip = null;
    public music: cc.AudioClip = null;

    public playEffect(sound: cc.AudioClip, volume = 1) {
        if (D.persisted.sound && sound) {
            cc.audioEngine.play(sound, false, volume);
        }
    }

    public playBubble() {
        this.playEffect(this.bubble, D.persisted.isSFXVolumeOverride ? D.persisted.sfxBubbleVolume : D.persisted.sfxVolume);
    }

    public playClick() {
        this.playEffect(this.click, D.persisted.isSFXVolumeOverride ? D.persisted.sfxClickVolume : D.persisted.sfxVolume);
    }

    public playCompleted() {
        this.playEffect(this.completed, D.persisted.isSFXVolumeOverride ? D.persisted.sfxCompletedVolume : D.persisted.sfxVolume);
    }

    public playError() {
        this.playEffect(this.error, D.persisted.isSFXVolumeOverride ? D.persisted.sfxErrorVolume : D.persisted.sfxVolume);
    }

    public playFreeChest() {
        this.playEffect(this.freechest, D.persisted.isSFXVolumeOverride ? D.persisted.sfxFreeChestVolume : D.persisted.sfxVolume);
    }

    public playGold() {
        this.playEffect(this.gold, D.persisted.isSFXVolumeOverride ? D.persisted.sfxGoldVolume : D.persisted.sfxVolume);
    }

    public playKaching() {
        this.playEffect(this.kaching, D.persisted.isSFXVolumeOverride ? D.persisted.sfxKachingVolume : D.persisted.sfxVolume);
    }

    public playPowerUp() {
        this.playEffect(this.levelup, D.persisted.isSFXVolumeOverride ? D.persisted.sfxPowerupVolume : D.persisted.sfxVolume);
    }    

    public playLevelUp() {
        this.playEffect(this.levelup, D.persisted.isSFXVolumeOverride ? D.persisted.sfxLevelupVolume : D.persisted.sfxVolume);
    }

    public load(): Promise<void> {
        if (getDebugUrlParams().fastload) {
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            cc.resources.loadDir("sound", cc.AudioClip, (err, sounds: cc.AudioClip[]) => {
                if (err) {
                    cc.error(err);
                }
                sounds.forEach((s) => {
                    if (typeof this[s.name] !== "undefined") {
                        this[s.name] = s;
                    } else {
                        cc.warn(`File: ${s.name} does not have a definition in AudioController`);
                    }
                });
                for (const key in this) {
                    if (Object.prototype.hasOwnProperty.call(this, key)) {
                        if (!key.startsWith("_") && !this[key]) {
                            cc.warn(`Property: ${key} is null, the sound file is missing`);
                        }
                    }
                }
                resolve();
            });
        });
    }

    public syncMusicSetting() {
        cc.audioEngine.setMusicVolume(D.persisted.music ? D.persisted.musicVolume : 0);
    }

    public playMusic() {
        this.syncMusicSetting();
        if (this.music) {
            cc.audioEngine.playMusic(this.music, true);
        }
    }
}
