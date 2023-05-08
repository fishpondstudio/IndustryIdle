import { ACH } from "../CoreGame/AchievementDefinitions";
import { Buildings } from "../CoreGame/Buildings/BuildingDefinitions";
import { CHANGELOG } from "../CoreGame/Changelog";
import { COLORS, getCurrentColor, isDarkTheme, setCurrentColor } from "../CoreGame/ColorThemes";
import { HexagonGrid } from "../CoreGame/HexagonGrid";
import { BLD, DEP, MAP, POLICY, RES } from "../CoreGame/Logic/Logic";
import { Resources } from "../CoreGame/ResourceDefinitions";
import { runMigration } from "../CoreGame/RunMigration";
import { SquareGrid } from "../CoreGame/SquareGrid";
import { initPathFinderWorker } from "../CoreGame/TowerDefense/PathFinder";
import { AudioController } from "../General/AudioController";
import { BUILD_NUMBER } from "../General/BuildNumber";
import { SCENES } from "../General/Constants";
import {
    authenticatePlayer,
    clearTrades,
    D,
    DLC,
    G,
    GameData,
    getCurrentVersion,
    IWasmSeedFunction,
    loadData,
    saveDataOverride,
    syncFPSSetting,
    T,
    verify,
    verifyPurchases,
} from "../General/GameData";
import {
    camelCaseToDash,
    forEach,
    getDebugUrlParams,
    getResourceUrl,
    keysOf,
    loadScene,
    rejectIn,
    sizeOf,
    versionToNumber,
} from "../General/Helper";
import { t } from "../General/i18n";
import { hasSteamWebSignIn, isArmorGames, isSteam, NativeSdk, steamworks } from "../General/NativeSdk";
import { serverNow } from "../General/ServerClock";
import { Socket } from "../General/Socket";
import { startWebLogin } from "./HeadquarterPage";
import { reloadGame } from "./UIHelper";
import {
    hideAlert,
    hideLoader,
    routeTo,
    showAlert,
    showArmorGamesLoader,
    showLoader,
    showToast,
    StartUI,
    waitForArmorGamesLoaderToFinish,
} from "./UISystem";

const { ccclass, property } = cc._decorator;

let dataLoaded = false;

export function isDataLoaded() {
    return dataLoaded;
}

@ccclass
export default class ResourceLoader extends cc.Component {
    @property({ type: [cc.Asset] }) private styles: cc.Asset[] = [];
    @property({ type: cc.TextAsset }) private worker: cc.TextAsset = null;

    protected override onLoad() {
        cc.game.addPersistRootNode(this.node);
        if (G.res) {
            cc.warn("Multiple ResourceLoader found!");
        }
        G.res = this;

        if (isSteam()) {
            cc.game.off(cc.game.EVENT_SHOW);
            cc.game.off(cc.game.EVENT_HIDE);
        }

        // CSS Style
        const s = document.createElement("style");
        s.innerHTML = this.styles.join("");
        document.head.appendChild(s);

        isArmorGames() ? showArmorGamesLoader() : showLoader();
        cc.debug.setDisplayStats(false);
        G.audio = new AudioController();

        loadData<GameData>()
            .then((data) => {
                cc.log("Game data loaded:", data);
                if (data) {
                    if (!verify(data)) {
                        throw new Error(t("SaveFileCorrupted"));
                    }
                    const gameVersion = getCurrentVersion();
                    if (versionToNumber(data.persisted.version) > versionToNumber(gameVersion)) {
                        throw new Error(
                            t("SaveVersionTooNew", {
                                saveVersion: data.persisted.version,
                                gameVersion,
                            })
                        );
                    }
                    Object.assign(D, data, {
                        persisted: Object.assign(D.persisted, data.persisted),
                        swissBoosts: Object.assign(D.swissBoosts, data.swissBoosts),
                    });
                    D.isFirstSession = false;
                }
                dataLoaded = true;
                // Color theme has to be initialized as soon as possible - otherwise UI will not work.
                initColorTheme();
                // Set allowed orientation
                NativeSdk.allowPortrait(D.persisted.allowPortrait);
                setTimeout(authenticatePlayer, 5000);
                const promises = [connectToSocket(), G.audio.load()];
                if (!getDebugUrlParams().fastload) {
                    promises.unshift(loadDeposits());
                    promises.unshift(loadBuildings());
                }
                return Promise.all(promises);
            })
            .then(() => {
                return verifyPurchases();
            })
            .then(() => {
                return new Promise<void>((resolve) => {
                    if (hasSteamWebSignIn() && D.persisted.cf && !CC_DEBUG) {
                        hideLoader();
                        showAlert(t("SteamLogin"), t("SteamLoginDialogDesc"), [
                            {
                                class: "outline red",
                                name: t("SteamLoginNo"),
                                action: () => {
                                    saveDataOverride(new GameData()).then(() => window.location.reload());
                                },
                            },
                            {
                                class: "outline",
                                name: t("SteamLoginYes"),
                                action: startWebLogin,
                            },
                        ]);
                    } else {
                        resolve();
                    }
                });
            })
            .then(() => {
                return fetch(getResourceUrl("wasm/release.wasm"))
                    .then((res) => res.arrayBuffer())
                    .then((bytes) =>
                        WebAssembly.instantiate(bytes, {
                            Date: { now: serverNow },
                            env: { abort: console.error },
                        })
                    )
                    .then((module) => {
                        G.wasm.cf = module.instance.exports.cf as IWasmSeedFunction;
                        G.wasm.price = module.instance.exports.price as IWasmSeedFunction;
                    });
            })
            .then(() => {
                ////////////////////////////////////////////////
                // Data migration/correction
                runMigration();
                ////////////////////////////////////////////////

                G.audio.playMusic();
                syncFPSSetting();

                if (CC_DEBUG) {
                    runDebugOnly();
                }

                const map = MAP[D.map];
                switch (map.gridType) {
                    case "hex":
                        G.grid = new HexagonGrid(map.size, 32);
                        break;
                    case "square":
                        G.grid = new SquareGrid(map.size, 50);
                        break;
                    default:
                        cc.warn("No gridType on map, default to square grid!");
                        G.grid = new SquareGrid(map.size, 50);
                        break;
                }

                G.pfWorker = new Worker(URL.createObjectURL(new Blob([this.worker.text], { type: "text/javascript" })));
                initPathFinderWorker();
                ////////////////////////////////////////////////
                return loadScene(getDebugUrlParams().scene ?? SCENES.Main);
            })
            .then(() => {
                if (isArmorGames()) {
                    return waitForArmorGamesLoaderToFinish();
                }
                return Promise.resolve();
            })
            .then(() => {
                if (D.isFirstSession) {
                    routeTo("/first-time");
                } else if (!CC_DEBUG) {
                    routeTo("/main");
                }
                StartUI();
                hideLoader();
            })
            .catch((err: Error) => {
                initColorTheme();
                hideLoader();
                showAlert(
                    t("LoadGameError"),
                    [
                        m("div", t("LoadGameErrorDesc")),
                        m(".text-s.mt5", t("LoadGameErrorMessage", { message: err.message })),
                    ],
                    [
                        {
                            name: t("LoadGameErrorHardReset"),
                            action: () => {
                                G.audio.playClick();
                                hideAlert();
                                showLoader();
                                clearTrades(D.persisted.userId);
                                saveDataOverride(new GameData()).then(() => reloadGame());
                            },
                            class: "outline red",
                        },
                        { name: t("LoadGameErrorRetry"), action: () => window.location.reload(), class: "outline" },
                    ]
                );
                throw err;
            });
    }
}

declare global {
    interface Window {
        D: GameData;
        G: typeof G;
        T: typeof T;
        BLD: Record<string, any>;
    }
}

function runDebugOnly() {
    window.D = D;
    window.G = G;
    window.T = T;

    const result: Record<string, any> = {};
    forEach(BLD, (k, building) => {
        // Make a copy!
        result[k] = { ...building };
        result[k].name = building.name();
        if (building.recipes) {
            result[k].recipes = building.recipes();
        }
        delete result[k].spriteFrame;
    });
    window.BLD = result;

    const lastVersion = CHANGELOG[0];
    cc.log(
        lastVersion.version +
            `-build.${BUILD_NUMBER}` +
            "\n" +
            lastVersion.content.map((c) => `- ${c}`).join("\n") +
            "\n" +
            `There are ${sizeOf(RES)} resources, ${sizeOf(BLD)} factories, ${sizeOf(POLICY)} policies, ${
                Object.keys(MAP).length
            } maps and ${sizeOf(ACH)} achievements available in this version`
    );
    DLC.forEach((dlc) => {
        cc.log(
            `${dlc.toUpperCase()} Buildings:`,
            keysOf(BLD)
                .filter((b) => BLD[b].dlc === dlc)
                .map((b) => BLD[b].name())
                .join(", ")
        );
        cc.log(
            `${dlc.toUpperCase()} Policies:`,
            keysOf(POLICY)
                .filter((b) => POLICY[b].dlc === dlc)
                .map((b) => POLICY[b].name())
                .join(", ")
        );
        cc.log(
            `${dlc.toUpperCase()} Maps:`,
            keysOf(MAP)
                .filter((b) => MAP[b].dlc === dlc)
                .map((b) => MAP[b].name())
                .join(", ")
        );
    });
}

function initColorTheme() {
    if (isSteam()) {
        steamworks.setFullScreen(D.persisted.fullscreen);
    }
    const colorOverrides = {};
    forEach(D.persisted.colorThemeOverrides, (k, v) => {
        colorOverrides[k] = cc.color().fromHEX(v);
    });
    setCurrentColor(Object.assign({}, COLORS[D.persisted.colorTheme], colorOverrides));
    const s = document.createElement("style");
    const theme = getCurrentColor();
    let colors = keysOf(theme)
        .map((k) => {
            const v = theme[k];
            if (v instanceof cc.Color) {
                return (
                    `--color-${camelCaseToDash(k)}:${v.r},${v.g},${v.b};\n` +
                    `--color-${camelCaseToDash(k)}-darker:${chroma(v.toHEX()).darken(0.25).rgb().join(",")};\n` +
                    `--color-${camelCaseToDash(k)}-lighter:${chroma(v.toHEX()).brighten(0.25).rgb().join(",")};\n`
                );
            }
            return "";
        })
        .join("\n");
    colors += `\ncolor-scheme: ${isDarkTheme() ? "dark" : "light"};`;
    // cc.log(colors);
    const panelHeight = `\n--portrait-panel-height: ${D.persisted.panelHeight}%`;
    s.innerHTML = `:root{${colors}${panelHeight}} html {font-size: ${16 * parseFloat(D.persisted.fontSizeScaling)}px}`;
    document.head.appendChild(s);
}

async function connectToSocket(): Promise<void> {
    G.socket = new Socket();
    try {
        await Promise.race([G.socket.connect(), rejectIn(5)]);
    } catch (error) {
        G.audio.playError();
        showToast(t("OfflineModeDesc") + ". " + error);
    }
}

function loadAtlasOrDir(atlasPath: string, dirPath: string): Promise<cc.SpriteFrame[]> {
    return new Promise((resolve, reject) => {
        cc.resources.load(atlasPath, cc.SpriteAtlas, (err, asset: cc.SpriteAtlas) => {
            const spriteFrames = asset.getSpriteFrames();
            if (!err && spriteFrames.length > 0) {
                resolve(spriteFrames);
                return;
            }
            cc.resources.loadDir(dirPath, cc.SpriteFrame, (err, assets: cc.SpriteFrame[]) => {
                if (err) {
                    reject();
                } else {
                    resolve(assets);
                }
            });
        });
    });
}

async function loadBuildings(): Promise<void> {
    const sprites = await loadAtlasOrDir("buildings/BuildingAtlas", "buildings");
    sprites.forEach((sprite) => {
        if (sprite.name in BLD) {
            BLD[sprite.name as keyof Buildings].spriteFrame = sprite;
        } else {
            cc.warn(`${sprite.name} is found in resources/buildings but does not exist in building catalog`);
        }
    });
    keysOf(BLD).forEach((r) => {
        if (!r.startsWith("_") && !BLD[r].spriteFrame) {
            cc.warn(`${r} does not have SpriteFrame set, please add the texture to resources/buildings`);
        }
    });
}

async function loadDeposits(): Promise<void> {
    const assets = await loadAtlasOrDir("deposits/DepositAtlas", "deposits");
    assets.forEach((asset) => {
        if (asset.name in RES) {
            RES[asset.name as keyof Resources].spriteFrame = asset;
        } else {
            cc.warn(`${asset.name} is found in resources/deposits but does not exist in resource catalog`);
        }
    });
    keysOf(DEP).forEach((r) => {
        if (!RES[r].spriteFrame) {
            cc.warn(`${r} does not have SpriteFrame set, please add the textrue to resources/deposits`);
        }
    });
}
