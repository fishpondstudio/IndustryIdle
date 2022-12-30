import { tickUI } from "../CoreGame/RunEvery";
import { TIPS } from "../CoreGame/Tips";
import { AYService } from "../General/AYService";
import { SCENES } from "../General/Constants";
import { G, T } from "../General/GameData";
import { getDebugUrlParams, hasValue, MINUTE } from "../General/Helper";
import { t } from "../General/i18n";
import { OnKeyDown, OnKeyUp } from "../General/KeyboardEventListener";
import { isSteam, NativeSdk } from "../General/NativeSdk";
import { initWebRTC } from "../General/WebRTC";
import { AchievementsPage } from "./AchievementsPage";
import { AudioSettingsPage } from "./AudioSettingsPage";
import { BuildPage } from "./BuildPage";
import { ChatPage } from "./ChatPage";
import { ChooseFlagPage } from "./ChooseFlagPage";
import { CityPage } from "./CityPage";
import { CentralBankPage } from "./CentralBankPage";
import { ColorThemeEditorPage } from "./ColorThemeEditorPage";
import { ConglomeratePage } from "./ConglomeratePage";
import { ConstructionPage } from "./ConstructionPage";
import { DisplaySettingsPage } from "./DisplaySettingsPage";
import { FirstTimePage } from "./FirstTimePage";
import { GameplaySettingsPage } from "./GameplaySettingsPage";
import { HeadquarterPage } from "./HeadquarterPage";
import { HudPage } from "./HudPage";
import { InputSettingsPage } from "./InputSettingsPage";
import { InspectPage } from "./InspectPage";
import { LogisticsDepartmentPage } from "./LogisticsDepartmentPage";
import { LeaderboardPage } from "./LeaderboardPage";
import { MainPage } from "./MainPage";
import { PatchNotesPage } from "./PatchNotesPage";
import { PlayerTradeHistoryPage } from "./PlayerTradeHistoryPage";
import { PlayerTradePage } from "./PlayerTradePage";
import { PolicyCenterPage } from "./PolicyCenterPage";
import { SettingsPage } from "./SettingsPage";
import { StatPage } from "./StatPage";
import { SwissShopPage } from "./SwissShopPage";
import { SwissBoostPage } from "./SwissBoostPage";
import { SwissUpgradePage } from "./SwissUpgradePage";
import { TradeCenterPage } from "./TradeCenterPage";
import { WholesaleCenterPage } from "./WholesaleCenterPage";
import { saveAndForcefullyReload, saveAndQuit } from "./UIHelper";

const modalNode = document.createElement("div");
if (CC_DEBUG) {
    modalNode.classList.add("debug");
}

const toastNode = document.createElement("div");
toastNode.classList.add("toast-container");
toastNode.style.display = "none";

const loaderNode = document.createElement("div");
const headerNode = document.createElement("div");
const alertNode = document.createElement("div");
loaderNode.innerHTML = `<div class="loading"><div class="loader"></div></div>`;
loaderNode.style.display = "none";

const ONE_HOUR = 1000 * 60 * 60;
const ONE_DAY = ONE_HOUR * 24;

export const tabHeight = (cc.view.getFrameSize().height * 100) / cc.winSize.height;

if (!CC_EDITOR) {
    document.body.appendChild(modalNode);
    document.body.appendChild(headerNode);
    document.body.appendChild(alertNode);
    document.body.appendChild(loaderNode);
    document.body.appendChild(toastNode);
    fetch("https://play.industryidle.com/banner.html")
        .then((r) => r.text())
        .then((t) => (G.banner = t));
}

export const OFFLINE_EARNING_MIN_TIME = MINUTE;

function getModalWidth(): number {
    return modalNode.children?.[0]?.clientWidth ?? 0;
}

type Orientation = "landscape" | "portrait";

let orientation: Orientation = "landscape";

export function getOrientation(): Orientation {
    return orientation;
}

export function onResize(width: number, height: number) {
    if (width > height) {
        orientation = "landscape";
        modalNode.classList.add("landscape");
        headerNode.classList.add("landscape");
        modalNode.classList.remove("portrait");
        headerNode.classList.remove("portrait");
    } else {
        orientation = "portrait";
        modalNode.classList.add("portrait");
        headerNode.classList.add("portrait");
        modalNode.classList.remove("landscape");
        headerNode.classList.remove("landscape");
    }
}

export function StartUI() {
    m.route(modalNode, "/main", UI_ROUTES);
    m.mount(headerNode, HudPage);
    document.addEventListener("keydown", OnKeyDown);
    document.addEventListener("keyup", OnKeyUp);
    cc.game.canvas.addEventListener("keydown", OnKeyDown);
    cc.game.canvas.addEventListener("keyup", OnKeyUp);
    cc.game.canvas.addEventListener("webglcontextlost", () => {
        showAlert(t("GPUIsBusy"), t("GPUIsBusyDesc"), [
            { name: t("SaveAndReloadGame"), action: saveAndForcefullyReload },
        ]);
    });
    modalNode.addEventListener("mouseenter", (e) => {
        cc.game.canvas.dispatchEvent(new Event("mouseup"));
    });
    headerNode.addEventListener("mouseenter", (e) => {
        cc.game.canvas.dispatchEvent(new Event("mouseup"));
    });
    // setTimeout(() => {
    //     cc.game.canvas.getContext("webgl").getExtension("WEBGL_lose_context").loseContext();
    // }, 5000);
    initWebRTC();
}

function renderAlert(content: m.Children, button: m.Children) {
    m.render(alertNode, m(".alert", m(".container", [content, m(".btns", button)])));
}

interface IButton {
    name: string;
    action?: () => void;
    class?: string;
}

export function showAlert(title: m.Children, content: m.Children, buttons: IButton[]) {
    renderAlert(
        [m(".text-l.text-center", title), m(".sep10"), m(".text-desc", content), m(".sep20")],
        buttons.map((b) => {
            return m(
                ".btn",
                {
                    class: b.class,
                    onclick: b.action ?? hideAlert,
                },
                b.name
            );
        })
    );
}

export function hideAlert() {
    m.render(alertNode, null);
}

export const routeConfig = {
    shouldChangeRoute: (r: keyof typeof UI_ROUTES, params: Record<string, string | number> = {}) => true,
};

export function routeTo(r: keyof typeof UI_ROUTES, params: Record<string, string | number> = {}) {
    if (!routeConfig.shouldChangeRoute(r, params)) {
        return;
    }
    G.world?.playerInput?.clearGridSelectHijack?.();
    G.audio.playClick();
    let queryString = "";
    if (!hasValue(params.left)) {
        params.left = m.route.param("left") ?? 0;
    }
    for (const k in params) {
        if (Object.prototype.hasOwnProperty.call(params, k)) {
            queryString += `${k}=${params[k]}&`;
        }
    }
    if (queryString.length > 0) {
        queryString = "?" + queryString.slice(0, -1);
    }
    G.onRedraw.on(() => {
        T.modalWidth = getModalWidth();
    });
    urlTo(r + queryString);
}

export function urlTo(url: string) {
    m.route.set(url);
}

document.addEventListener("click", (ev) => {
    const target = ev.target as HTMLElement;
    if (target.hasAttribute("data-native-open")) {
        NativeSdk.openUrl(target.getAttribute("data-native-open"));
    }
});

let lastBackPressedAt = 0;

window.addEventListener("onBackButtonPressed", () => {
    const close = document.querySelector(".close");
    if (close) {
        close.dispatchEvent(new MouseEvent("click"));
        return;
    }
    if (m.route.get().startsWith("/main") && cc.director.getScene().name === SCENES.Main) {
        if (Date.now() - lastBackPressedAt > 2 * 1000) {
            lastBackPressedAt = Date.now();
            showToast("Press back again to exit game");
        } else {
            NativeSdk.quit();
        }
    }
});

export const UI_ROUTES = {
    "/main": MainPage,
    "/hq": HeadquarterPage,
    "/inspect": InspectPage,
    "/construction": ConstructionPage,
    "/swiss-upgrade": SwissUpgradePage,
    "/swiss-boost": SwissBoostPage,
    "/build": BuildPage,
    "/first-time": FirstTimePage,
    "/city": CityPage,
    "/chat": ChatPage,
    "/leaderboard": LeaderboardPage,
    "/player-trade": PlayerTradePage,
    "/color-theme-editor": ColorThemeEditorPage,
    "/choose-flag": ChooseFlagPage,
    "/achievements": AchievementsPage,
    "/patch-notes": PatchNotesPage,
    "/settings": SettingsPage,
    "/audio-settings": AudioSettingsPage,
    "/display-settings": DisplaySettingsPage,
    "/gameplay-settings": GameplaySettingsPage,
    "/input-settings": InputSettingsPage,
    "/conglomerate": ConglomeratePage,
    "/swiss-shop": SwissShopPage,
    "/wholesale-center": WholesaleCenterPage,
    "/central-bank": CentralBankPage,
    "/trade-center": TradeCenterPage,
    "/stats": StatPage,
    "/policy-center": PolicyCenterPage,
    "/logistics-department": LogisticsDepartmentPage,
    "/player-trade-history": PlayerTradeHistoryPage,
};

let toastTimeoutId: number = null;

export function showToast(text: string, duration = 3500) {
    if (toastTimeoutId) {
        clearTimeout(toastTimeoutId);
        toastNode.style.display = "none";
    }

    toastNode.innerHTML = `<div class="toast">${text}</div>`;
    toastNode.style.display = "flex";

    toastNode.querySelector(".toast").addEventListener("click", (e) => {
        if (toastTimeoutId) {
            clearTimeout(toastTimeoutId);
        }
        toastNode.style.display = "none";
        toastTimeoutId = null;
    });

    toastTimeoutId = setTimeout(() => {
        toastNode.style.display = "none";
        toastTimeoutId = null;
    }, duration);
}

export function showLoader() {
    cc.game.pause();
    loaderNode.innerHTML = `<div class="loading"><div class="loader"></div><div class="tips">💡 ${TIPS.randOne()}</div></div>`;
    loaderNode.style.display = "flex";
}

export function showArmorGamesLoader() {
    cc.game.pause();
    loaderNode.innerHTML = `<div id="armorgames" class="loading"><video autoplay="true" preload="auto" width="648" height="432" muted><source src="https://files.armorgames.com/intro/648x432_v1.m4v" type="video/mp4"><source src="https://files.armorgames.com/intro/648x432_v1.webm" type="video/webm"><source src="https://files.armorgames.com/intro/648x432_v1.ogg" type="video/ogg"></video><div class="tips">💡 ${TIPS.randOne()}</div></div>`;
    loaderNode.style.display = "flex";
}

export function waitForArmorGamesLoaderToFinish(): Promise<void> {
    const loader = document.querySelector("#armorgames video") as HTMLVideoElement;
    if (loader == null) {
        return Promise.resolve();
    }
    if (loader.ended) {
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        loader.onended = () => {
            loader.onended = null;
            resolve();
        };
    });
}

let standby = false;

export function isStandby(): boolean {
    return standby;
}

function hideStandby() {
    loaderNode.style.display = "none";
    loaderNode.removeEventListener("click", hideStandby);
    standby = false;
    tickUI();
}

export function showStandby() {
    loaderNode.innerHTML = `<div class="loading"><div class="text-xl">${t("StandbyModeOn")}</div><div class="mt10">${t(
        "StandbyModeOnDesc"
    )}</div></div>`;
    loaderNode.style.display = "flex";
    standby = true;
    loaderNode.addEventListener("click", hideStandby);
}

export function hideLoader() {
    cc.game.resume();
    loaderNode.style.display = "none";
}

const popups: (() => void)[] = [];

export function promptPopups() {
    if (popups.length === 0) {
        return false;
    }
    popups.shift()();
    return true;
}

window.addEventListener("unhandledrejection", (event) => {
    AYService.trackError(event?.reason);
});

window.addEventListener("error", (event) => {
    AYService.trackError(event?.message);
});

if (isSteam()) {
    window.ipcRenderer.on("will-close", saveAndQuit);
}

export function isMapEditMode(): boolean {
    return !!getDebugUrlParams().edit;
}
