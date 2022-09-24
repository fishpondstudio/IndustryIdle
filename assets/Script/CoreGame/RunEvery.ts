import { Cycle, D, getCurrentVersion, saveData, T } from "../General/GameData";
import { toggleRenderer } from "../General/Helper";
import { isSteam } from "../General/NativeSdk";
import { serverNow } from "../General/ServerClock";
import { isStandby } from "../UI/UISystem";
import { tickAchievements } from "./AchievementDefinitions";
import { tickCrowdfundingAndNews } from "./Logic/Crowdfunding";
import { tickInterestRate, tickPrice } from "./Logic/Price";
import { tickBuildings, tickOfflineEarning, tickOrder, tickPolicy, tickPower, tickResources } from "./Logic/Tick";

export function runEverySecond() {
    const now = serverNow();
    clearCache();
    T.tickCount++;
    D.tickCount++;
    D.producedTicks++;
    tickPolicy(now);
    tickResources();
    tickPrice();
    tickCrowdfundingAndNews();
    tickPower();
    tickBuildings();
    tickOfflineEarning(now);
    tickOrder(now);
    tickCycle(now);
    tickUI();
    tickSave();
}

export function runEveryMinute() {
    tickAchievements();
    if (T.tickCount >= 60) {
        tickInterestRate();
    }
}

function clearCache() {
    T.adjacentCount = {};
    T.stableAdjacentCount = {};
    T.adjacentMines = {};
}

function tickCycle(now: number) {
    D.persisted.lastTickAt = Math.max(now, D.persisted.lastTickAt);
    D.persisted.version = getCurrentVersion();
    T.current = T.next;
    T.next = new Cycle();
}

export function tickUI() {
    if (isStandby()) {
        toggleRenderer(false);
    } else {
        toggleRenderer(true);
        if (!D.persisted.fps30 || (D.persisted.fps30 && T.tickCount % 2 === 1)) {
            m.redraw();
        }
    }
}
function tickSave() {
    if (isSteam() && T.tickCount % 60 === 0) {
        saveData();
        return;
    }
    if (T.tickCount % 2 === 0) {
        saveData();
    }
}
