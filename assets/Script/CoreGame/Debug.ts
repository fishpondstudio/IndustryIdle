import { SAVE_FILE_KEY } from "../Config/Config";
import { GAME_DATA_LS_KEY } from "../General/Constants";
import { clearTrades, D, DLC, G, getCurrentVersion, saveDataOverride, sign, T, verify } from "../General/GameData";
import { forEach, keysOf, MINUTE, uuidv4 } from "../General/Helper";
import { NativeSdk } from "../General/NativeSdk";
import { changeClock, serverNow } from "../General/ServerClock";
import { ACH } from "./AchievementDefinitions";
import { addCash, allResourcesValue, BLD, canBuild, RES } from "./Logic/Logic";
import { runPriceTest, tickPrice } from "./Logic/Price";

declare global {
    interface Window {
        _D: Debug;
    }
}

class Debug {
    public setExpansionPack1(on: true) {
        if (on) {
            D.persisted.dlc[DLC[0]] = true;
        } else {
            delete D.persisted.dlc[DLC[0]];
        }
    }

    public addCash(c: number) {
        addCash(c);
    }

    public setPrestigeCurrency(c: number) {
        D.persisted.prestigeCurrency = c;
        D.persisted.allPrestigeCurrency = c;
    }

    public offlineMinute(m: number) {
        D.persisted.lastTickAt = serverNow() - m * MINUTE;
    }

    public changeClock(m: number) {
        changeClock(m * MINUTE);
    }

    public generateOrder() {
        T.lastOrderAt = 1;
    }

    public updatePrice() {
        D.lastPricedAt = 0;
        tickPrice();
    }

    public updatePriceMid(ignoreMap = true) {
        D.lastPricedAt = 0;
        tickPrice(() => 0.5, ignoreMap);
    }

    public updatePriceRand(ignoreMap = true) {
        D.lastPricedAt = 0;
        tickPrice(Math.random, ignoreMap);
    }

    public unlockAllBuildings() {
        forEach(BLD, (k, v) => {
            if (!k.startsWith("_")) {
                D.unlockedBuildings[k] = true;
            }
        });
    }

    public setAllResources(amount: number) {
        forEach(RES, (k, v) => {
            G.tradeCenter.resources[k] = amount;
        });
    }

    public rv() {
        return allResourcesValue();
    }

    public hardReset() {
        cc.game.pause();
        NativeSdk.removeItem(GAME_DATA_LS_KEY).then(() => window.location.reload());
    }

    public decryptJSON(data: string) {
        return JSON.parse(CryptoJS.AES.decrypt(data, SAVE_FILE_KEY).toString(CryptoJS.enc.Utf8));
    }

    public loadSave(data: any) {
        cc.game.pause();
        saveDataOverride(
            Object.assign(data, {
                persisted: { userId: uuidv4(), leaderboardOptOut: true },
            })
        ).then(() => window.location.reload());
    }

    public sign(data: any) {
        return sign(data);
    }

    public verify(data: any) {
        return verify(data);
    }

    public clearTrades() {
        clearTrades(D.persisted.userId);
    }

    public logStatic() {
        const result = {
            _version: getCurrentVersion(),
            buildings: {},
            achievements: {},
        };
        keysOf(BLD)
            .sort()
            .map((k) => {
                if (canBuild(k)) {
                    const v = BLD[k];
                    result.buildings[k] = {
                        input: v.staticInput,
                        output: v.staticOutput,
                        power: v.power,
                        dlc: v.dlc,
                    };
                }
            });
        keysOf(ACH)
            .sort()
            .map((k) => {
                const v = ACH[k];
                result.achievements[k] = {
                    name: v.name(),
                    desc: v.desc(),
                    reward: v.reward,
                };
            });
        cc.log(JSON.stringify(result));
    }

    public drawCoordinate() {
        G.world.forEachOverlay((xy, label) => {
            label.string = xy;
            label.node.color = cc.Color.WHITE;
            label.node.opacity = 255;
            label.node.active = true;
        });
    }

    public runPriceTest() {
        runPriceTest();
    }
}

if (!CC_EDITOR && CC_DEBUG) {
    window._D = new Debug();
}
