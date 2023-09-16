import { SAVE_FILE_KEY } from "../Config/Config";
import { ACH } from "../CoreGame/AchievementDefinitions";
import {
    BuildingNumberMap,
    Buildings,
    ResourceNumberMap,
    ResourceSet,
} from "../CoreGame/Buildings/BuildingDefinitions";
import { CHANGELOG } from "../CoreGame/Changelog";
import { COLORS } from "../CoreGame/ColorThemes";
import { Grid } from "../CoreGame/GridHelper";
import { ICrowdfunding } from "../CoreGame/Logic/Crowdfunding";
import { Entity, PowerBankEntity } from "../CoreGame/Logic/Entity";
import { EntityDefaultType, getEntityDefault } from "../CoreGame/Logic/EntityDefault";
import { IOrder, IPolicyInfo, MAP } from "../CoreGame/Logic/Logic";
import { IMarketNews } from "../CoreGame/MarketNews";
import { Policy } from "../CoreGame/PolicyDefinitions";
import { Resources } from "../CoreGame/ResourceDefinitions";
import World from "../CoreGame/World";
import { DE } from "../Languages/de";
import { EN } from "../Languages/en";
import { ES } from "../Languages/es";
import { FR } from "../Languages/fr";
import { HU } from "../Languages/hu";
import { JP } from "../Languages/jp";
import { KR } from "../Languages/kr";
import { NL } from "../Languages/nl";
import { PL } from "../Languages/pl";
import { PT_BR } from "../Languages/pt-BR";
import { RU } from "../Languages/ru";
import { TR } from "../Languages/tr";
import { VN } from "../Languages/vn";
import { ZH_CN } from "../Languages/zh-CN";
import { ZH_HK } from "../Languages/zh-HK";
import { ZH_TW } from "../Languages/zh-TW";
import ResourceLoader from "../UI/ResourceLoader";
import { AudioController } from "./AudioController";
import { GAME_DATA_LS_KEY } from "./Constants";
import { forEach, getDebugUrlParams, hasValue, murmurhash3, sizeOf, uuidv4, xmur3 } from "./Helper";
import { t } from "./i18n";
import { isAndroid, isIOS, isSteam, NativeSdk, Platform, steamworks } from "./NativeSdk";
import { serverNow } from "./ServerClock";
import { CHAT_CHANNEL, Socket } from "./Socket";
import { TypedEvent } from "./TypedEvent";

// tslint:disable: max-classes-per-file

export const MAX_ENERGY = 60;
export const ENERGY_PER_MIN = 1;
export const ENERGY_COST = 20;

class GlobalRef {
    res: ResourceLoader;
    audio: AudioController;
    world: World;
    socket: Socket;
    grid: Grid;
    tradeCenter: Entity;
    centralBank: Entity;
    swissShop: Entity;
    wholesaleCenter: Entity;
    statBureau: Entity;
    policyCenter: Entity;
    researchLab: Entity;
    headquarter: Entity;
    logisticsDept: Entity;
    buildingTiers: BuildingNumberMap = {};
    resourceTiers: ResourceNumberMap = {};
    onRedraw = new TypedEvent<void>();
    wasm: Record<string, IWasmSeedFunction> = {};
    pfWorker: Worker;
    banner: string;
}

export type IWasmSeedFunction = (a: number, b: number) => number;

export const G = new GlobalRef();

export interface ResourceNode {
    dot?: cc.Sprite;
    fromXy: string;
    toXy: string;
    fromPosition: cc.Vec3;
    toPosition: cc.Vec3;
    type: keyof Resources;
    fuelCost: number;
    fuelRes: keyof Resources;
    totalTime: number;
    aliveUntil: number;
    amount: number;
}

export type IBoostCache = Record<string, Partial<Record<keyof Buildings, [number, number]>>>;

// This is needed here to avoid cycle reference (which Cocos cannot handle)
const _RES = new Resources();

export class Cycle {
    boosts: IBoostCache = {};
    boostsStable: IBoostCache = {};
    // power = 0;
    powerSupply = 0;
    powerUsage = 0;
    powerRequired = 0;
    fuelCost = 0;
    industryZoneTier: Record<string, number> = {};
    industryZonePermit = 0;
    industryZone: Record<string, true> = {};
    io: Partial<Record<keyof Resources, [number, number]>> = {};
    constructor() {
        forEach(_RES, (k) => {
            this.io[k] = [0, 0];
        });
    }
}

export type ModalPosition = "left" | "right" | "hidden";

export class TempData {
    current = new Cycle();
    next = new Cycle();
    lastOrderAt = 0;
    modalWidth = 0;
    modalPosition: ModalPosition = "hidden";
    buildingCount: BuildingNumberMap = {};
    workingBuildingCount: BuildingNumberMap = {};
    res: ResourceNumberMap = {};
    usableRes: ResourceNumberMap = {};
    resToBldCache: Partial<Record<keyof Resources, Entity[]>> = {};
    powerBanks: PowerBankEntity[] = [];
    stableInputOutput: Partial<Record<keyof Resources, [number, number]>> = {};
    dots: Record<string, ResourceNode> = {};
    adjacentCount: Record<string, number> = {};
    adjacentMines: Record<string, Entity[]> = {};
    stableAdjacentCount: Record<string, number> = {};
    visibleResources: (keyof Resources)[] = [];
    timeSeries: Record<string, [number[], number[]]> = {};
    diffTimeSeries: Record<string, [number[], number[]]> = {};
    tickQueue: string[] = [];
    tickQueueLength = 0;
    tickCount = 0;
    currentWaveStatus: WaveStatus = "init";
}

export type WaveStatus = "init" | "inProgress" | "success" | "fail";

export interface IPrice {
    price: number;
    elasticity: number;
    quantity: number;
}

export const T = new TempData();

export const MAX_BOOSTER_SLOTS = 9;

export const BLOCK_COLORS = {
    Green: cc.color().fromHEX("#00cec9"),
    Purple: cc.color().fromHEX("#6c5ce7"),
    Pink: cc.color().fromHEX("#e84393"),
    Orange: cc.color().fromHEX("#e17055"),
    Yellow: cc.color().fromHEX("#fdcb6e"),
    Blue: cc.color().fromHEX("#0984e3"),
};

export interface IOfflineEarning {
    start: number;
    end: number;
    cashPerMinute: number;
    researchPoint: number;
    production: ResourceNumberMap;
}

export function syncFPSSetting() {
    cc.game.setFrameRate(D.persisted.fps30 ? 30 : 60);
}

export const Languages = {
    DE: DE,
    EN: EN,
    ES: ES,
    FR: FR,
    JP: JP,
    KR: KR,
    NL: NL,
    PL: PL,
    PT_BR: PT_BR,
    RU: RU,
    VN: VN,
    ZH_CN: ZH_CN,
    ZH_HK: ZH_HK,
    ZH_TW: ZH_TW,
    TR: TR,
    HU: HU,
} as const;

export const BatchModeOptions = {
    adjacent: () => t("BatchModeAdjacent"),
    cluster: () => t("BatchModeCluster"),
    all: () => t("BatchModeAll"),
} as const;

export type BatchMode = keyof typeof BatchModeOptions;

export class PersistedData {
    version = getCurrentVersion();
    tips = 0;
    fps30 = false;
    sound = true;
    music = false;
    isSFXVolumeOverride = false;
    musicVolume = 0.25;
    sfxVolume = 0.25;
    sfxBubbleVolume = 0.25;
    sfxClickVolume = 0.25;
    sfxCompletedVolume = 0.25;
    sfxErrorVolume = 0.25;
    sfxFreeChestVolume = 0.25;
    sfxGoldVolume = 0.25;
    sfxKachingVolume = 0.25;
    sfxLevelupVolume = 0.25;
    sfxPowerupVolume = 0.25;
    edgePanEnabled = false;
    edgePanSize = 20;
    edgePanSensitivity = 5;
    gameControllerEnabled = true;
    gameControllerCursorSensitivity = 10;
    gameControllerCameraSensitivity = 10;
    gameControllerScrollSensitivity = 20;
    panelPosition: PanelPosition = "auto";
    panelHeight: PanelHeight = "60";
    offlineEarningMinutes = 60 * 4;
    batchMode: BatchMode = "all";
    allowPortrait = false;
    prestigeCurrency = 0;
    allPrestigeCurrency = 0;
    lastTickAt = serverNow();
    maxBuilders = 1;
    builderSpeedUpPercentage = 0;
    language: keyof typeof Languages = "EN";
    productionMultiplier = 1;
    autoSellCapacityMultiplier = 1;
    buildingPermitCostDivider = 1;
    buildingUpgradeCostDivider = 1;
    swissBoostCostDivider = 1;
    extraAdjacentBonus = 0;
    extraTradeQuota = 0;
    sellRefundPercentage = 50;
    fuelDiscount = 0;
    hideRewardAd = false;
    yAxisStartsFromZero = true;
    showSupplyChain = false;
    fullscreen = false;
    hideDiscordBanner = false;
    hideChat = isIOS();
    hideChatMentions = false;
    buildingColors: Partial<Record<keyof Buildings, string>> = {};
    dlc: Partial<Record<DownloadableContent, boolean>> = {};
    userId = uuidv4();
    tradeToken = uuidv4();
    userName: string;
    lastNameChangedAt = 0;
    showStandbyModeInToolbar = false;
    flag = "earth";
    fontSizeScaling: FontSizeScaling = "1";
    scrollSensitivity: ScrollSensitivity = 1;
    chatChannel: keyof typeof CHAT_CHANNEL = "en";
    leaderboardOptOut = false;
    industryZoneCapacityBooster = 0;
    achievements: Partial<Record<keyof typeof ACH, { achieved: boolean; claimed: boolean }>> = {};
    cf = false;
    useScientificNotation = false;
    colorTheme: keyof typeof COLORS = "Blue";
    colorThemeOverrides: Record<string, string> = {};
    resourceMovement: ResourceMovement = "show";
    extraBuildingPermit = 0;
    autoClaimTradeOrder = false;
    disableBuildWarningPowerBank = false;
    disableBuildWarningResourceBooster = false;
    constructor() {
        this.userName = `${this.userId.substr(0, 6).toUpperCase()}`;
        this.panelPosition = isIOS() || isAndroid() ? "auto" : "right";
        this.edgePanEnabled = !isIOS() && !isAndroid();
    }
}

export const FontSizeScalingOptions = ["0.9", "1", "1.1", "1.2", "1.3", "1.4", "1.5"] as const;
export type FontSizeScaling = (typeof FontSizeScalingOptions)[number];

export const ScrollSensitivityOptions = [0.1, 0.2, 0.5, 1, 2, 5, 10] as const;
export type ScrollSensitivity = (typeof ScrollSensitivityOptions)[number];

export const ResourceMovementOptions = {
    show: () => t("ResourceMovementShow"),
    viewport: () => t("ResourceMovementViewport"),
    highlight: () => t("ResourceMovementHighlight"),
    line: () => t("ResourceMovementLine"),
    hide: () => t("ResourceMovementHide"),
} as const;

export const PortraitPanelHeightOptions = {
    "80": "80%",
    "60": "60%",
    "40": "40%",
};

export type PanelHeight = keyof typeof PortraitPanelHeightOptions;

export type ResourceMovement = keyof typeof ResourceMovementOptions;

export function getCurrentVersion() {
    return CHANGELOG[0].version;
}

export class SwissBoosts {
    productionMultiplier = 1;
    buildingPermitCostDivider = 1;
    buildingUpgradeCostDivider = 1;
    autoSellCapacityMultiplier = 1;
    industryZoneCapacityBooster = 0;
    extraTradeQuota = 0;
    extraBuildingPermit = 0;
    resourceExplorerAllDeposits = false;
    wholesaleUpgrade1 = false;
    offlineResearch = false;
    produceAllCrops = false;
    researchAgreement = false;
}

export class GameData {
    persisted = new PersistedData();
    swissBoosts = new SwissBoosts();
    mapCreatedAt = serverNow();
    sig = "";
    isFirstSession = true;
    map: keyof typeof MAP = "Oslo";
    seed: string = null;
    buildingPermit = 20;
    offlineEarnings: IOfflineEarning[] = [];
    buildings: Record<string, Entity> = {};
    buildingsToConstruct: Record<string, Entity> = {};
    unlockedBuildings: Partial<Record<keyof Buildings, boolean>> = {};
    fuelResType: keyof Resources = "Petrol";
    autoSellPerSec = 10;
    autoSellConcurrency = 3;
    autoSellRes: Partial<Record<keyof Resources, boolean>> = {};
    price: Partial<Record<keyof Resources, IPrice>> = {};
    marketNews: Partial<Record<keyof Resources, IMarketNews>> = {};
    lastPricedAt = 0;
    cashSpent = 0;
    stockRating = 1;
    cashPerSec = 0;
    tradeAmount = 0;
    oneOffTradeQuota = 1e9;
    oneOffTradeQuotaUsed = 0;
    tradeAmountPerPlayer: Record<string, number> = {};
    lastCrowdfundingAt = 0;
    crowdfunding: Record<string, ICrowdfunding> = {};
    orders: IOrder[] = [];
    policies: Partial<Record<keyof Policy, IPolicyInfo>> = {};
    producedRes: ResourceNumberMap = {};
    tradedRes: ResourceNumberMap = {};
    tradeProfit = 0;
    producedTicks = 0;
    hideResourcesInTopBar: ResourceSet = {};
    tickCount = 0;
    waveCount = 0;
    entityDefault: EntityDefaultType = getEntityDefault();
}

export function hasDLC(dlc: DownloadableContent): boolean {
    if (!dlc) {
        return true;
    }
    return hasValue(D.persisted.dlc[dlc]);
}

export function hasAnyDlc() {
    return sizeOf(D.persisted.dlc) > 0;
}

function convertSKUsToDLCs(purchases: string[]): Partial<Record<DownloadableContent, true>> {
    const dlc: Partial<Record<DownloadableContent, true>> = {};
    purchases.forEach((p) => {
        const d = PlatformSKUs[NativeSdk.name()]?.[p];
        if (d) {
            dlc[d] = true;
        }
        // Handle old iOS/Android pricing
        if ((isIOS() || isAndroid()) && p === "dlc1") {
            dlc[DLC[0]] = true;
            dlc[DLC[1]] = true;
        }
    });
    // Handle debug
    if (CC_DEBUG) {
        // DLC.forEach((d) => {
        //     dlc[d] = true;
        // });
    }
    return dlc;
}

export function syncPurchases(verifiedPurchases: string[]) {
    const dlc = convertSKUsToDLCs(verifiedPurchases);
    D.persisted.cf = !containsDlc(dlc, D.persisted.dlc);
    D.persisted.dlc = dlc;
}

export function addPurchases(verifiedPurchases: string[]) {
    const dlc = convertSKUsToDLCs(verifiedPurchases);
    D.persisted.dlc = { ...D.persisted.dlc, ...dlc };
}

export async function verifyPurchases() {
    try {
        syncPurchases(await NativeSdk.verifyPurchases());
    } catch (err) {
        D.persisted.dlc = {};
    }
}

export function containsDlc(
    a: Partial<Record<DownloadableContent, boolean>>,
    b: Partial<Record<DownloadableContent, boolean>>
) {
    a = a ?? {};
    b = b ?? {};
    let contains = true;
    forEach(b, (k, v) => {
        if (a[k] !== v) {
            contains = false;
        }
    });
    return contains;
}

export function dlcLabel(dlc: DownloadableContent): string {
    switch (dlc) {
        case "dlc1":
            return t("RequireExpansionPack1");
        case "dlc2":
            return t("RequireExpansionPack2");
        default:
            return "";
    }
}

export function dlcDesc(dlc: DownloadableContent): string {
    switch (dlc) {
        case "dlc1":
            return t("RequireExpansionPack1Desc");
        case "dlc2":
            return t("RequireExpansionPack2Desc");
        default:
            return "";
    }
}

export const DLC = ["dlc1", "dlc2"] as const;
export type DownloadableContent = (typeof DLC)[number];
export const PlatformSKUs: Partial<Record<Platform, Record<string, DownloadableContent>>> = {
    iOS: {
        ep1: DLC[0],
        ep2: DLC[1],
    },
    Android: {
        ep1: DLC[0],
        ep2: DLC[1],
    },
    Steam: {
        1577540: DLC[0],
        1807800: DLC[1],
    },
    Unknown: {
        1577540: DLC[0],
        1807800: DLC[1],
    },
} as const;

export const PanelPositionOptions = {
    auto: () => t("PanelPositionAuto"),
    left: () => t("PanelPositionLeft"),
    leftFloat: () => t("PanelPositionLeftFloat"),
    right: () => t("PanelPositionRight"),
    rightFloat: () => t("PanelPositionRightFloat"),
} as const;

export type PanelPosition = keyof typeof PanelPositionOptions;

export const ORIGINAL_GAMEDATA = Object.freeze(new GameData());

export const D = new GameData();

export function loadData<K>(): Promise<K> {
    return NativeSdk.getItem<K>(GAME_DATA_LS_KEY);
}

export function sign<T extends { sig: string }>(data: T): T {
    delete data.sig;
    const str =
        Object.keys(data)
            .sort()
            .map((k) => JSON.stringify(data[k]))
            .join() + SAVE_FILE_KEY;
    data.sig = xmur3(str)().toString(16);
    return data;
}

export function signTrade<T extends { sig: string; token: string }>(data: T): T {
    delete data.sig;
    data.token = D.persisted.tradeToken;
    const str =
        Object.keys(data)
            .sort()
            .map((k) => JSON.stringify(data[k]))
            .join() + SAVE_FILE_KEY;
    data.sig = murmurhash3(str, Math.floor(serverNow() / 5000)).toString(16);
    return data;
}

export function verify(data: GameData): boolean {
    const actual = data.sig;
    sign(data);
    return actual === data.sig;
}

export function saveData(): Promise<void> {
    sign(D);
    return NativeSdk.setItem(GAME_DATA_LS_KEY, JSON.stringify(D));
}

export function saveDataOverride(d: GameData): Promise<void> {
    sign(d);
    return NativeSdk.setItem(GAME_DATA_LS_KEY, JSON.stringify(d));
}

export function signAndEncryptData(data: GameData) {
    sign(data);
    return encryptData(data);
}

export function encryptData<T>(data: T) {
    return CryptoJS.AES.encrypt(JSON.stringify(data), SAVE_FILE_KEY).toString(CryptoJS.format.OpenSSL);
}

export function decryptData<T>(encrypted: string): T {
    const decrypted = CryptoJS.AES.decrypt(encrypted, SAVE_FILE_KEY);
    return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8)) as T;
}

export function clearTrades(userId: string): Promise<Response> {
    return fetch(`${API_HOST}/trade/clear`, {
        method: "post",
        headers: { "X-User-Id": userId },
    });
}

export async function getAuthQueryString(): Promise<string> {
    const appId = isSteam() ? `&appId=${await steamworks.getAppId()}` : "";
    const ticket = await NativeSdk.getAuthTicket();
    const token = ticket ? `&token=${ticket}` : "";
    return `user=${
        D.persisted.userId
    }${token}&platform=${NativeSdk.name().toLowerCase()}${appId}&version=${getCurrentVersion()}`;
}

export async function authenticatePlayer(): Promise<Response> {
    return fetch(`${API_HOST}/user/authentication?${await getAuthQueryString()}`, {
        method: "post",
        headers: { "X-User-Id": D.persisted.userId },
    });
}

export function removeTrade(tradeId: string): Promise<Response> {
    return fetch(`${API_HOST}/trade/remove?id=${tradeId}`, {
        method: "post",
        headers: { "X-User-Id": D.persisted.userId },
    });
}

const serverOverride = getDebugUrlParams().server;
export const API_HOST = serverOverride ? `http://${serverOverride}` : "https://api.fishpondstudio.com";

export function muteUser(ip: string, time: number) {
    return fetch(`${API_HOST}/chat/mute?ip=${ip}&time=${time}`, {
        method: "post",
        headers: { "X-User-Id": D.persisted.userId },
    });
}

export function checkVerification() {
    return fetch(`${API_HOST}/user/verification?tradeToken=${D.persisted.tradeToken}`, {
        method: "post",
        headers: { "X-User-Id": D.persisted.userId },
    });
}

export function refreshTradeToken(token: string) {
    return fetch(`${API_HOST}/trade/import-save?token=${token}`, {
        method: "post",
        headers: { "X-User-Id": D.persisted.userId },
    });
}

export function forceRestoreTradeToken() {
    return fetch(`${API_HOST}/trade/force-restore?token=${D.persisted.tradeToken}`, {
        method: "post",
        headers: { "X-User-Id": D.persisted.userId },
    });
}
