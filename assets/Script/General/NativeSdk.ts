/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/ban-types */
import { GD_GAME_ID } from "../Config/Config";
import { idbDel, idbGet, idbSet } from "../UI/Lib/idb-keyval";
import { AD_EVENT_CANCELLED, AD_EVENT_COMPLETED, AD_EVENT_ERROR } from "./ANEvents";
import { API_HOST, D, DLC, PlatformSKUs } from "./GameData";
import { forEach, hasValue, keysOf, resolveIn, uuidv4 } from "./Helper";

const SECOND = 1000;
export const MINUTE = SECOND * 60;

declare global {
    interface Window {
        _handleMessage: (error: boolean, id: string, data: any) => void;
    }
}

const bridge: Record<string, { resolve: Function; reject: Function }> = {};
window._handleMessage = (err, id, data) => {
    if (!bridge[id]) {
        cc.warn(`Received a message from Native but there's no registered handler: ${id}`);
        return;
    }
    if (err) {
        bridge[id].reject(new Error(data));
    } else {
        bridge[id].resolve(data);
    }
    delete bridge[id];
};
function addToBridge(resolve: Function, reject: Function): string {
    const id = uuidv4();
    bridge[id] = { resolve, reject };
    return id;
}

interface IAndroidSdk {
    canShowRewardVideo: () => boolean;
    canShowInterstitial: () => boolean;
    queryProducts: (id: string, sku: string) => void;
    buyProduct: (id: string, skuDetails: string) => void;
    restorePurchases: (id: string) => void;
    canPurchase: (id: string) => void;
    showRewardVideo: (id: string) => void;
    showInterstitial: () => void;
    getItem(key: string): string | undefined;
    removeItem(key: string): void;
    setItem(key: string, value: string): void;
    openURL: (url: string) => void;
    scheduleNotification: (title: string, content: string, delayInMs: number, id: number) => void;
    getAuthTicket(id: string): void;
    saveFile(id: string, suggestedName: string, content: string): void;
    readFile(id: string): void;
    quit: () => void;
    allowPortrait(allow: boolean): void;
}

export interface IProductInfo {
    sku: string;
    price: string;
}

export interface INativeStorage {
    getItem(key: string): Promise<string>;
    removeItem(key: string): void;
    setItem(key: string, value: string): void;
}

declare const AndroidSdk: IAndroidSdk;

declare global {
    // tslint:disable-next-line: interface-name
    interface Window {
        webkit: any;
        CrazyGames: any;
        GD_OPTIONS: any;
        SDK_OPTIONS: any;
        gdsdk: any;
        sdk: any;
    }
}

export interface INotification {
    title: string;
    content: string;
    delayInMs: number;
}

export type Platform = "iOS" | "Android" | "CrazyGames" | "GameDistribution" | "Steam" | "Unknown";

let steamWebSignedIn = false;

export function isSteamWebSignedIn() {
    return steamWebSignedIn;
}

export class DefaultNativeSdk {
    name(): Platform {
        return "Unknown";
    }
    loadAd(): void {}
    showRewardVideo(): Promise<void> {
        return Promise.reject();
    }
    showInterstitial(): Promise<void> {
        return Promise.reject();
    }
    canShowRewardVideo(): Promise<boolean> {
        return Promise.resolve(false);
    }
    canShowInterstitial(): Promise<boolean> {
        return Promise.resolve(false);
    }
    async getItem<T>(key: string): Promise<T> {
        const value = await idbGet<string>(key);
        if (!value) {
            return null;
        }
        return JSON.parse(value) as T;
    }
    setItem(key: string, value: string): Promise<void> {
        return idbSet(key, value);
    }
    removeItem(key: string): Promise<void> {
        return idbDel(key);
    }
    celebrate(): void {
        if (navigator.vibrate) {
            navigator.vibrate(500);
        }
    }
    openUrl(url: string): void {
        window.open(url, "_blank");
    }
    scheduleNotifications(notifications: INotification[]) {}
    canPurchase(): Promise<boolean> {
        return Promise.resolve(false);
    }
    queryProducts(sku: readonly string[]): Promise<IProductInfo[]> {
        return Promise.reject();
    }
    buyProduct(sku: string): Promise<string[]> {
        return Promise.reject();
    }
    verifyPurchases(): Promise<string[]> {
        return this.restorePurchases();
    }
    async restorePurchases(): Promise<string[]> {
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");
        const result: Record<string, true> = {};
        if (token) {
            try {
                const r = await fetch(`${API_HOST}/steam/verify?token=${token}&userId=${D.persisted.userId}`);
                if (r.status === 200) {
                    const json = await r.json();
                    forEach(json, (id: string, owned) => {
                        if (owned) {
                            result[id] = true;
                        }
                    });
                    steamWebSignedIn = true;
                }
            } catch (error) {
                cc.error(error);
            }
        }
        return keysOf(result);
    }
    getAuthTicket(): Promise<string> {
        return Promise.resolve("");
    }
    activateAchievement(name: string): Promise<void> {
        return Promise.reject();
    }
    allowPortrait(allow: boolean): void {}
    async saveFile(suggestedName: string, content: string): Promise<void> {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName,
            });
            const stream = await handle.createWritable();
            await stream.write(content);
            await stream.close();
        } catch (error) {
            downloadFile(content, suggestedName);
        }
    }
    async readFile(): Promise<string> {
        if (!window.showOpenFilePicker) {
            throw new Error("Your browser doesn't support importing save file, consider using latest Chrome/Edge");
        }
        const [handle] = await window.showOpenFilePicker();
        const file = await handle.getFile();
        const text = await file.text();
        return text;
    }
    quit(): void {}
}

function downloadFile(suggestedName: string, content: string) {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    document.body.appendChild(a);
    a.style.display = "none";
    a.href = url;
    a.download = suggestedName;
    a.click();
    window.URL.revokeObjectURL(url);
}

export function nativeBridgePromise(invoke: () => void): Promise<void> {
    return new Promise((resolve, reject) => {
        const unsubscribe = () => {
            window.removeEventListener(AD_EVENT_COMPLETED, res);
            window.removeEventListener(AD_EVENT_CANCELLED, rej);
            window.removeEventListener(AD_EVENT_ERROR, rej);
        };
        const res = () => {
            unsubscribe();
            resolve();
        };
        const rej = () => {
            unsubscribe();
            reject("Failed to load ad");
        };
        window.addEventListener(AD_EVENT_COMPLETED, res);
        window.addEventListener(AD_EVENT_CANCELLED, rej);
        window.addEventListener(AD_EVENT_ERROR, rej);
        invoke();
    });
}

export function loadJS(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`head > script[src="${src}"]`) !== null) {
            return resolve();
        }
        const script = document.createElement("script");
        script.src = src;
        script.type = "text/javascript";
        script.async = true;
        document.head.appendChild(script);
        script.onload = () => resolve();
        script.onerror = reject;
    });
}

//#region AndroidNativeSdk
class AndroidNativeSdk extends DefaultNativeSdk {
    override name(): Platform {
        return "Android";
    }
    override loadAd() {
        // No-op. Android loads ad automatically
    }
    override showRewardVideo() {
        return new Promise<void>((resolve, reject) => {
            const id = uuidv4();
            bridge[id] = { resolve, reject };
            AndroidSdk.showRewardVideo(id);
        });
    }
    override showInterstitial() {
        return Promise.resolve(AndroidSdk.showInterstitial());
    }
    override canShowRewardVideo(): Promise<boolean> {
        return Promise.resolve(AndroidSdk.canShowRewardVideo());
    }
    override canShowInterstitial(): Promise<boolean> {
        return Promise.resolve(AndroidSdk.canShowInterstitial());
    }
    override openUrl(url: string) {
        AndroidSdk.openURL(url);
    }
    override scheduleNotifications(notifications: INotification[]) {
        notifications.forEach((n, i) => AndroidSdk.scheduleNotification(n.title, n.content, n.delayInMs, i));
    }
    override getItem<T>(key: string): Promise<T> {
        const data = AndroidSdk.getItem(key);
        return Promise.resolve(data ? (JSON.parse(data) as T) : null);
    }
    override setItem(key: string, value: string): Promise<void> {
        return Promise.resolve(AndroidSdk.setItem(key, value));
    }
    override allowPortrait(allow: boolean): void {
        AndroidSdk.allowPortrait(allow);
    }
    override removeItem(key: string): Promise<void> {
        return Promise.resolve(AndroidSdk.removeItem(key));
    }
    override canPurchase(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => AndroidSdk.canPurchase(addToBridge(resolve, reject)));
    }
    override queryProducts(sku: readonly string[]): Promise<IProductInfo[]> {
        return new Promise<IProductInfo[]>((resolve, reject) => {
            AndroidSdk.queryProducts(addToBridge(resolve, reject), JSON.stringify(sku));
        });
    }
    override buyProduct(sku: string): Promise<string[]> {
        return new Promise((resolve, reject) => {
            AndroidSdk.buyProduct(addToBridge(resolve, reject), sku);
        });
    }
    override restorePurchases(): Promise<string[]> {
        return new Promise((resolve, reject) => {
            AndroidSdk.restorePurchases(addToBridge(resolve, reject));
        });
    }
    override readFile(): Promise<string> {
        return new Promise((resolve, reject) => {
            AndroidSdk.readFile(addToBridge(resolve, reject));
        });
    }
    override saveFile(suggestedName: string, content: string): Promise<void> {
        return new Promise((resolve, reject) => {
            AndroidSdk.saveFile(addToBridge(resolve, reject), suggestedName, content);
        });
    }
    override getAuthTicket(): Promise<string> {
        return new Promise((resolve, reject) => {
            AndroidSdk.getAuthTicket(addToBridge(resolve, reject));
        });
    }
    override quit() {
        AndroidSdk.quit();
    }
}

export function isAndroid() {
    return typeof AndroidSdk !== "undefined";
}

//#endregion

//#region GDNativeSdk

class GDNativeSdk extends DefaultNativeSdk {
    private gd;
    constructor() {
        super();
        this.gd = null;
        if (isGD()) {
            cc.game.pause();
            window.GD_OPTIONS = {
                gameId: GD_GAME_ID,
                onEvent(event) {
                    switch (event.name) {
                        case "SDK_GAME_START":
                            cc.game.resume();
                            break;
                        case "SDK_GAME_PAUSE":
                            cc.game.pause();
                            break;
                        case "SDK_REWARDED_WATCH_COMPLETE":
                            window.dispatchEvent(new Event(AD_EVENT_COMPLETED));
                            break;
                    }
                },
            };
            loadJS("https://html5.api.gamedistribution.com/main.min.js").then(() => {
                cc.log("GameDistribution.com SDK loaded");
                this.gd = window.gdsdk;
            });
        }
    }
    override name(): Platform {
        return "GameDistribution";
    }
    override loadAd() {
        this.gd.preloadAd("rewarded");
    }
    override showRewardVideo() {
        return nativeBridgePromise(() => {
            this.gd.showAd("rewarded");
            this.loadAd();
        });
    }
    override showInterstitial() {
        return nativeBridgePromise(() => this.gd.showAd());
    }
    override canShowRewardVideo(): Promise<boolean> {
        return Promise.resolve(true);
    }
    override canShowInterstitial(): Promise<boolean> {
        return Promise.resolve(true);
    }
}

export function isGD() {
    return window.location.href.includes("gamedistribution");
}

//#endregion

//#region CrazyGamesNativeSdk
class CrazyGamesNativeSdk extends DefaultNativeSdk {
    private crazySdk;
    private lastRewardAdShownAt = 0;
    constructor() {
        super();
        if (isCrazyGames()) {
            loadJS("https://sdk.crazygames.com/crazygames-sdk-v1.js").then(() => {
                cc.log("CrazyGames.com SDK loaded");
                this.crazySdk = window.CrazyGames.CrazySDK.getInstance();
                this.crazySdk.init();
                this.crazySdk.addEventListener("adStarted", () => {
                    cc.game.pause();
                });
                this.crazySdk.addEventListener("adError", () => {
                    window.dispatchEvent(new Event(AD_EVENT_ERROR));
                    cc.game.resume();
                });
                this.crazySdk.addEventListener("adFinished", () => {
                    window.dispatchEvent(new Event(AD_EVENT_COMPLETED));
                    cc.game.resume();
                });
            });
        }
    }
    override name(): Platform {
        return "CrazyGames";
    }
    override loadAd() {
        // No-op
    }
    override showRewardVideo() {
        return nativeBridgePromise(() => {
            this.crazySdk.requestAd("rewarded");
            this.lastRewardAdShownAt = Date.now();
        });
    }
    override showInterstitial() {
        return nativeBridgePromise(() => this.crazySdk.requestAd("midgame"));
    }
    override canShowRewardVideo(): Promise<boolean> {
        return Promise.resolve(Date.now() - this.lastRewardAdShownAt > 3 * MINUTE);
    }
    override canShowInterstitial(): Promise<boolean> {
        return Promise.resolve(this.crazySdk.hasAdblock);
    }
    override celebrate() {
        this.crazySdk.happytime();
    }
}

export function isCrazyGames(): boolean {
    const url = window.location.href;
    return (
        url.includes("crazygames") ||
        url.includes("1001juegos") ||
        url.includes("speelspelletjes.nl") ||
        url.includes("onlinegame.co.id")
    );
}
//#endregion

export function isArmorGames(): boolean {
    return window.location.href.includes("armorgames");
}

//#region IOSNativeSdk
export class IOSNativeSdk extends DefaultNativeSdk {
    override name(): Platform {
        return "iOS";
    }
    override loadAd() {
        // No-op, iOS loads ads automatically
    }
    override showRewardVideo() {
        return new Promise<void>((resolve, reject) => {
            window.webkit.messageHandlers.native.postMessage({
                name: "showRewardVideo",
                id: addToBridge(resolve, reject),
            });
        });
    }
    override showInterstitial() {
        return new Promise<void>((resolve, reject) => {
            window.webkit.messageHandlers.native.postMessage({
                name: "showInterstitial",
                id: addToBridge(resolve, reject),
            });
        });
    }
    override canShowRewardVideo(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            window.webkit.messageHandlers.native.postMessage({
                name: "canShowRewardVideo",
                id: addToBridge(resolve, reject),
            });
        });
    }
    override canShowInterstitial(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            window.webkit.messageHandlers.native.postMessage({
                name: "canShowInterstitial",
                id: addToBridge(resolve, reject),
            });
        });
    }
    override getItem<T>(key: string): Promise<T> {
        return new Promise((resolve, reject) => {
            window.webkit.messageHandlers.native.postMessage({
                name: "getItem",
                key,
                id: addToBridge(resolve, reject),
            });
        });
    }
    override removeItem(key: string): Promise<void> {
        return new Promise((resolve, reject) => {
            window.webkit.messageHandlers.native.postMessage({
                name: "removeItem",
                key,
                id: addToBridge(resolve, reject),
            });
        });
    }
    override allowPortrait(allow: boolean): void {
        new Promise((resolve, reject) => {
            window.webkit.messageHandlers.native.postMessage({
                name: "allowPortrait",
                allow,
                id: addToBridge(resolve, reject),
            });
        });
    }
    override setItem(key: string, value: string): Promise<void> {
        return new Promise((resolve, reject) => {
            window.webkit.messageHandlers.native.postMessage({
                name: "setItem",
                key,
                value,
                id: addToBridge(resolve, reject),
            });
        });
    }
    override canPurchase(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            window.webkit.messageHandlers.native.postMessage({
                name: "canPurchase",
                id: addToBridge(resolve, reject),
            });
        });
    }
    override queryProducts(sku: readonly string[]): Promise<IProductInfo[]> {
        return new Promise<IProductInfo[]>((resolve, reject) => {
            window.webkit.messageHandlers.native.postMessage({
                name: "queryProducts",
                id: addToBridge(resolve, reject),
                sku: JSON.stringify(sku),
            });
        });
    }
    override buyProduct(sku: string): Promise<string[]> {
        return new Promise((resolve, reject) => {
            window.webkit.messageHandlers.native.postMessage({
                name: "buyProduct",
                id: addToBridge(resolve, reject),
                sku: sku,
            });
        });
    }
    override restorePurchases(): Promise<string[]> {
        return new Promise((resolve, reject) => {
            window.webkit.messageHandlers.native.postMessage({
                name: "restorePurchases",
                id: addToBridge(resolve, reject),
            });
        });
    }
    override verifyPurchases(): Promise<string[]> {
        return new Promise((resolve, reject) => {
            window.webkit.messageHandlers.native.postMessage({
                name: "verifyPurchases",
                id: addToBridge(resolve, reject),
            });
        });
    }
    override openUrl(url: string) {
        window.webkit.messageHandlers.native.postMessage({
            name: "openURL",
            url,
        });
    }
    override scheduleNotifications(notifications: INotification[]) {
        notifications.forEach((n, i) =>
            window.webkit.messageHandlers.native.postMessage({
                name: "scheduleNotification",
                title: n.title,
                content: n.content,
                delayInMs: n.delayInMs,
                id: i,
            })
        );
    }
    override readFile(): Promise<string> {
        return new Promise((resolve, reject) => {
            window.webkit.messageHandlers.native.postMessage({
                id: addToBridge(resolve, reject),
                name: "readFile",
            });
        });
    }
    override saveFile(suggestedName: string, content: string): Promise<void> {
        return new Promise((resolve, reject) => {
            window.webkit.messageHandlers.native.postMessage({
                id: addToBridge(resolve, reject),
                name: "saveFile",
                suggestedName,
                content,
            });
        });
    }
    override getAuthTicket(): Promise<string> {
        return new Promise((resolve, reject) => {
            window.webkit.messageHandlers.native.postMessage({
                name: "getAuthTicket",
                id: addToBridge(resolve, reject),
            });
        });
    }
}

export function isIOS(): boolean {
    return window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.native;
}

//#endregion

let steamAuthTicket = "";

//#region SteamNativeSdk
export class SteamNativeSdk extends DefaultNativeSdk {
    override name(): Platform {
        return "Steam";
    }
    override openUrl(url: string): void {
        steamworks.openUrl(url);
    }
    override canPurchase(): Promise<boolean> {
        return Promise.resolve(true);
    }
    override async queryProducts(): Promise<IProductInfo[]> {
        const result: IProductInfo[] = [];
        const steamDLCs = await getAllSteamDLCs();
        steamDLCs.forEach((dlc) => {
            if (dlc.available && PlatformSKUs.Steam[dlc.appId]) {
                // Price is hardcoded!
                result.push({ sku: String(dlc.appId), price: "$4.99" });
            }
        });
        return result;
    }
    override buyProduct(sku: string): Promise<string[]> {
        if (sku === DLC[0]) {
            const url = `https://store.steampowered.com/app/${sku}`;
            this.openUrl(url);
            steamworks.activateGameOverlayToWebPage(url);
        }
        return Promise.resolve([]);
    }
    override async restorePurchases(): Promise<string[]> {
        const result: string[] = [];
        for (const appId in PlatformSKUs.Steam) {
            if (await steamworks.isDLCInstalled(parseInt(appId, 10))) {
                result.push(appId);
            }
        }
        return result;
    }
    override async getAuthTicket(): Promise<string> {
        if (!navigator.onLine) {
            return steamAuthTicket;
        }
        if (!steamAuthTicket) {
            steamAuthTicket = (
                await Promise.race([steamworks.getAuthSessionTicket(), resolveIn(5, { ticket: steamAuthTicket })])
            ).ticket;
        }
        return steamAuthTicket;
    }
    override async getItem<T>(key: string): Promise<T> {
        try {
            const data = await steamworks.readTextFromFile(key);
            return JSON.parse(data) as T;
        } catch (error) {
            cc.error(error);
            return null;
        }
    }
    override setItem(key: string, value: string): Promise<void> {
        return Promise.all([steamworks.saveTextToFile(key, value), steamworks.saveTextToLocalFile(key, value)]).then(
            () => Promise.resolve()
        );
    }
    override removeItem(key: string): Promise<void> {
        return idbDel(key);
    }
    override activateAchievement(name: string): Promise<void> {
        return steamworks.activateAchievement(name);
    }
    override quit(): void {
        steamworks.quit();
    }
}

export const steamworks = {
    getSteamId: () => window.ipcRenderer.invoke<any>("getSteamId"),
    isDLCInstalled: (id: number) => window.ipcRenderer.invoke<boolean>("isDLCInstalled", id),
    getDLCCount: () => window.ipcRenderer.invoke<number>("getDLCCount"),
    getDLCDataByIndex: (idx: number) => window.ipcRenderer.invoke<ISteamDLC>("getDLCDataByIndex", idx),
    activateGameOverlay: (option: string) => window.ipcRenderer.invoke<void>("activateGameOverlay", option),
    activateGameOverlayToWebPage: (url: string) => window.ipcRenderer.invoke<void>("activateGameOverlayToWebPage", url),
    openUrl: (url: string) => window.ipcRenderer.invoke<void>("openUrl", url),
    getAppId: () => window.ipcRenderer.invoke<number>("getAppId"),
    saveTextToFile: (name: string, content: string) => window.ipcRenderer.invoke<void>("saveTextToFile", name, content),
    readTextFromFile: (name: string) => window.ipcRenderer.invoke<string>("readTextFromFile", name),
    saveTextToLocalFile: (name: string, content: string) =>
        window.ipcRenderer.invoke<void>("saveTextToLocalFile", name, content),
    readTextFromLocalFile: (name: string) => window.ipcRenderer.invoke<string>("readTextFromLocalFile", name),
    getAuthSessionTicket: () => window.ipcRenderer.invoke<{ ticket: string; handle: number }>("getAuthSessionTicket"),
    activateAchievement: (name: string) => window.ipcRenderer.invoke<void>("activateAchievement", name),
    setNativeTheme: (theme: "dark" | "light" | "system") => window.ipcRenderer.invoke<void>("setNativeTheme", theme),
    setFullScreen: (fullscreen: boolean) => window.ipcRenderer.invoke<void>("setFullScreen", fullscreen),
    showMessageBox: (
        message: string,
        detail: string,
        buttons: string[],
        type?: "none" | "info" | "error" | "question" | "warning"
    ) =>
        window.ipcRenderer.invoke<{
            response: number;
            checkboxChecked: boolean;
        }>("showMessageBox", message, detail, buttons, type),
    quit: () => window.ipcRenderer.invoke<void>("quit"),
    forcefullyReload: () => window.ipcRenderer.invoke<void>("forcefullyReload"),
};

async function getAllSteamDLCs(): Promise<ISteamDLC[]> {
    const result: ISteamDLC[] = [];
    const count = await steamworks.getDLCCount();
    for (let i = 0; i < count; i++) {
        result.push(await steamworks.getDLCDataByIndex(i));
    }
    return result;
}

export function isSteam(): boolean {
    return hasValue(window.ipcRenderer);
}

export function hasSteamWebSignIn() {
    return !isIOS() && !isAndroid() && !isSteam();
}

declare global {
    interface Window {
        ipcRenderer?: {
            invoke: <T>(method: string, ...args: any[]) => Promise<T>;
            on: Function;
        };
    }
}

interface ISteamDLC {
    appId: number;
    available: boolean;
    name: string;
}

//#endregion

export let NativeSdk = new DefaultNativeSdk();

if (isIOS()) {
    NativeSdk = new IOSNativeSdk();
} else if (isAndroid()) {
    NativeSdk = new AndroidNativeSdk();
} else if (isCrazyGames()) {
    NativeSdk = new CrazyGamesNativeSdk();
} else if (isGD()) {
    NativeSdk = new GDNativeSdk();
} else if (isSteam()) {
    NativeSdk = new SteamNativeSdk();
}

if (!CC_EDITOR) {
    cc.log("NativeSDK Platform:", NativeSdk.name());
}
