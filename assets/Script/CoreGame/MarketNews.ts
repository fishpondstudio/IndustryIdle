import { D } from "../General/GameData";
import { extrapolate, keysOf, srand } from "../General/Helper";
import { t } from "../General/i18n";
import { Buildings } from "./Buildings/BuildingDefinitions";
import { BLD, canPrice, MAP, RES, resourcesBeingProduced } from "./Logic/Logic";
import { hasInputOnAllMaps, hasInputOnCurrentMap, hasOutputOnAllMaps, hasOutputOnCurrentMap } from "./Logic/Production";
import { Resources } from "./ResourceDefinitions";

export const MarketNewsFilter = ["input", "output", "both"] as const;
export type MarketNewsFilter = typeof MarketNewsFilter[number];
export type MarketNewsApplyTo = "global" | "map" | "player";

export interface IMarketNews {
    resource: keyof Resources;
    filter: MarketNewsFilter;
    range: MarketNewsApplyTo;
    modifier: number;
}

export function getApplyToI18n(applyTo: MarketNewsApplyTo): string {
    if (applyTo === "global") {
        return D.map === "HongKong" ? MAP[D.map].name() : t("MarketNewsApplyToGlobal");
    } else if (applyTo === "map") {
        return MAP[D.map].name();
    } else {
        return t("MarketNewsApplyToYou");
    }
}

export function getApplyToIcon(applyTo: MarketNewsApplyTo) {
    if (applyTo === "global") {
        return D.map === "HongKong" ? "place" : "public";
    } else if (applyTo === "map") {
        return "place";
    } else {
        return "navigation";
    }
}

export function affectedByNews(b: keyof Buildings, news: IMarketNews): boolean {
    if (news.filter === "input") {
        return BLD[b].staticInput[news.resource] > 0;
    }
    if (news.filter === "output") {
        return BLD[b].staticOutput[news.resource] > 0;
    }
    return BLD[b].staticInput[news.resource] > 0 || BLD[b].staticOutput[news.resource] > 0;
}

export function allAffectingNews(b: keyof Buildings): (keyof Resources)[] {
    return keysOf(D.marketNews).filter((k) => affectedByNews(b, D.marketNews[k]));
}

const NEWS_SEED = "qm646PTAdjYeycNMXup3YTHlkAz9En5BQjmLfWtz";

export function tickNews(id: number) {
    D.marketNews = {};
    rollNews(
        "global",
        keysOf(RES).filter((r) => canPrice(r) && hasOutputOnAllMaps(r) && hasInputOnAllMaps(r)),
        srand(NEWS_SEED + id)
    );
    rollNews(
        "map",
        keysOf(RES).filter((r) => canPrice(r) && hasOutputOnCurrentMap(r) && hasInputOnCurrentMap(r)),
        srand(NEWS_SEED + id + D.map)
    );
    rollNews("player", resourcesBeingProduced(), srand(NEWS_SEED + id + D.persisted.userId));
}

function rollNews(applyTo: MarketNewsApplyTo, resources: (keyof Resources)[], random: () => number) {
    resources
        .sort()
        .shuffle(random)
        .some((r) => {
            if (!D.marketNews[r]) {
                const filter = "output";
                const modifier = Math.round(extrapolate(random(), 0.5, 2) * 20) / 20;
                D.marketNews[r] = {
                    resource: r,
                    filter: filter,
                    modifier,
                    range: applyTo,
                };
                return true;
            }
            return false;
        });
}
