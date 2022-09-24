import { D, G } from "../../General/GameData";
import { DAY, forEach, keysOf, srand, uuidv4 } from "../../General/Helper";
import { serverNow } from "../../General/ServerClock";
import { IPledge, IPledgeMessage } from "../../General/Socket";
import { tickNews } from "../MarketNews";
import { Resources } from "../ResourceDefinitions";
import { canPrice } from "./Logic";
import { hasOutputOnAllMaps } from "./Production";

export interface ICrowdfundingResource {
    resource: keyof Resources;
    requiredAmount: number;
    actualAmount: number;
    paid: boolean;
}

export interface ICrowdfunding {
    resources: ICrowdfundingResource[];
    value: number;
}

const CROWDFUNDING_INTERVAL = DAY;

function getCrowdfundingId() {
    return Math.floor(serverNow() / CROWDFUNDING_INTERVAL);
}

export function getCrowdfundingTimeLeft(id: string): number {
    const num = parseInt(id, 10);
    return (num + 1) * CROWDFUNDING_INTERVAL - serverNow();
}

export function getCrowdfundingReturn(cf: ICrowdfunding): number {
    let result = 0;
    cf.resources.forEach((r) => {
        result += crowdfundingReturnOnResource(Math.round(r.actualAmount / r.requiredAmount));
    });
    if (D.map === "SanJose") {
        result += 0.25;
    }
    return result;
}

export function tickCrowdfundingAndNews(): void {
    const id = getCrowdfundingId();
    if (D.lastCrowdfundingAt === id) {
        return;
    }
    D.tradeAmountPerPlayer = {};
    D.lastCrowdfundingAt = id;
    tickNews(id);
    const seededRandom = srand(btoa(String(G.wasm.cf(id, CROWDFUNDING_INTERVAL))));
    const resourcesSortedByTier = keysOf(G.resourceTiers)
        .filter((res) => hasOutputOnAllMaps(res) && canPrice(res))
        .sort((a, b) => {
            const diff = G.resourceTiers[a] - G.resourceTiers[b];
            return diff !== 0 ? diff : a.localeCompare(b);
        });

    const slices = 3;
    const sliceSize = Math.ceil(resourcesSortedByTier.length / slices);
    const resources: (keyof Resources)[] = [];
    for (let i = 0; i < slices; i++) {
        const pool = resourcesSortedByTier.slice(sliceSize * i, sliceSize * (i + 1));
        if (pool.length > 0) {
            resources.push(pool.randOne(seededRandom));
        }
    }
    const cf: ICrowdfunding = {
        resources: resources.map((r, i) => {
            return {
                resource: r,
                requiredAmount: Math.pow(100, resources.length - i + 1),
                actualAmount: 0,
                paid: false,
            };
        }),
        value: 0,
    };
    forEach(D.crowdfunding, (id, cf) => {
        if (cf.value === 0) {
            delete D.crowdfunding[id];
        }
    });
    D.crowdfunding[id] = cf;
}

export function hasPendingCrowdfunding(): boolean {
    let result = false;
    forEach(D.crowdfunding, (id, cf) => {
        if (cf.value > 0) {
            result = true;
            return true;
        }
        return false;
    });
    return result;
}

export const CROWDFUNDING_TIER_BONUS = 0.05;

export function crowdfundingReturnOnResource(backers: number): number {
    return Math.floor(backers / 10) * CROWDFUNDING_TIER_BONUS;
}

export function sendPledgeMessage(pledges: { id: string; pledge: IPledge }[] = []): Promise<void> {
    const message: IPledgeMessage = {
        id: uuidv4(),
        type: "pledge",
        pledge: {},
    };

    pledges.forEach((p) => {
        if (!message.pledge[p.id]) {
            message.pledge[p.id] = [];
        }
        message.pledge[p.id].push(p.pledge);
    });

    forEach(D.crowdfunding, (id) => {
        if (!message.pledge[id]) {
            message.pledge[id] = [];
        }
    });
    return G.socket.send(message);
}
