import { D, G, IPrice, T } from "../../General/GameData";
import {
    clearGaussian,
    extrapolate,
    forEach,
    getMedian,
    hasValue,
    HOUR,
    keysOf,
    randomGaussian,
    SECOND,
    sizeOf,
    srand,
} from "../../General/Helper";
import { serverNow } from "../../General/ServerClock";
import { ResourceNumberMap } from "../Buildings/BuildingDefinitions";
import { depositsToPercentage } from "../MapDefinitions";
import { Resources } from "../ResourceDefinitions";
import {
    activeInputOutput,
    averageDepositPrice,
    canPrice,
    CROP,
    DEP,
    MAP,
    ORIGINAL_BLD,
    ORIGINAL_RES,
    stableInputOutput,
} from "./Logic";
import { getAutoSellAmountFor, getSwissMultiplier, PRODUCTION_SCALER } from "./Production";

export function priceUpdateInterval(): number {
    if (D.map === "HongKong") {
        return HOUR;
    }
    return 2 * HOUR;
}

function getPricingId() {
    return Math.floor(serverNow() / priceUpdateInterval());
}

export function tickPrice(debugRandom?: () => number, ignoreMap = false) {
    const priceAt = getPricingId();
    if (D.lastPricedAt === priceAt) {
        return;
    }

    const seed = btoa(String(G.wasm.price(priceAt, priceUpdateInterval())));
    const seededRandom = srand(btoa(seed));
    let random = seededRandom;
    if (D.map === "HongKong") {
        random = () => cc.misc.clampf(randomGaussian(0.5, 0.5 / 3, seededRandom), 0, 1);
        clearGaussian();
    }

    if (CC_DEBUG && hasValue(debugRandom)) {
        random = debugRandom;
    }
    ignoreMap = CC_DEBUG && ignoreMap;
    const isOffCycleUpdate = D.lastPricedAt === 0;
    const oldPrice = D.price;
    D.lastPricedAt = priceAt;
    D.price = {};
    D.stockRating = extrapolate(random(), 0.5, 1.5);
    // First set deposit price
    const depositPercentage = depositsToPercentage(MAP[D.map].deposits);
    const minPercentage = Object.values(depositPercentage).sort((a, b) => a - b)[0];
    keysOf(DEP).forEach((k) => {
        let scaler = depositPercentage[k]
            ? 1 / depositPercentage[k]
            : extrapolate(random(), 1 / minPercentage, 2 / minPercentage);
        if (ignoreMap) {
            scaler = 0.5 / minPercentage;
        }
        const price = scaler * extrapolate(random(), 5, 15);
        D.price[k] = {
            price: price,
            elasticity: calculateElasticity(k, price),
            quantity: 0,
        };
    });
    keysOf(CROP).forEach((k) => {
        const price = extrapolate(random(), 50, 100);
        const elasticity = calculateElasticity(k, price);
        D.price[k] = {
            price: price,
            elasticity: elasticity,
            quantity: 0,
        };
    });
    const basicPrice = { ...D.price };
    keysOf(ORIGINAL_RES).filter((k) => {
        D.price[k] = calculatePrice(
            k,
            (price) => {
                return price;
            },
            ignoreMap,
            false
        );
    });
    const basePrice = D.price;
    const dependencyOrder: ResourceNumberMap = {};

    const getDependencyOrder = (r: keyof Resources) => dependencyOrder[r] ?? 0;

    let count = 1;
    keysOf(basePrice)
        .sort((a, b) => basePrice[a].price - basePrice[b].price)
        .forEach((k, v) => {
            if (canPrice(k) && !DEP[k] && !CROP[k]) {
                dependencyOrder[k] = count++;
            }
        });

    cc.log("////////// Round 1 of pricing");
    D.price = basicPrice;
    logPriceDiff(() => {
        keysOf(DEP)
            .sort((a, b) => getDependencyOrder(a) - getDependencyOrder(b))
            .forEach((k) => {
                D.price[k] = calculatePrice(
                    k,
                    (price) => {
                        return price;
                    },
                    ignoreMap,
                    false
                );
            });
    });
    forEach(D.price, (k) => {
        if (!DEP[k] && !CROP[k]) {
            delete D.price[k];
        }
    });
    cc.log("////////// Round 2 of pricing");
    logPriceDiff(() => {
        const total = sizeOf(dependencyOrder);
        keysOf(ORIGINAL_RES)
            .sort((a, b) => getDependencyOrder(a) - getDependencyOrder(b))
            .forEach((k) => {
                D.price[k] = calculatePrice(
                    k,
                    (price) => {
                        if (DEP[k] || CROP[k]) {
                            return price;
                        }
                        if (!dependencyOrder[k]) {
                            cc.error(`${k} is not found in dependencyOrder!`);
                        }
                        const _max = Math.sqrt(total / dependencyOrder[k]) + 1;
                        let max = cc.misc.clampf(_max, 2, 4);
                        let min = 0.75;
                        if (k === "Bit" || k === "Doge") {
                            max *= 2;
                            min = 0.1;
                        }
                        // cc.log(
                        //     `Price range for: ${k}. Min = ${min}, Max = ${max}, Value = ${_max}, Index = ${total}/${dependencyIndex[k]}`
                        // );
                        return extrapolate(random(), min * price, max * price);
                    },
                    ignoreMap,
                    true
                );
            });
    });
    forEach(ORIGINAL_RES, (k, v) => {
        if (v.getPrice) {
            D.price[k] = {
                price: v.getPrice(averageDepositPrice(), random),
                quantity: 0,
                elasticity: 0,
            };
        }
    });
    forEach(D.price, (res, price) => {
        // Do not reset quantity if it is an off cycle market update
        if (isOffCycleUpdate && isFinite(oldPrice[res]?.quantity)) {
            D.price[res].quantity += oldPrice[res]?.quantity;
        }
        if (!isFinite(price.price) || !isFinite(price.elasticity)) {
            cc.warn(`Invalid price for ${res}`, price);
        }
    });
    // This needs to be cleared at the end since its used for pricing!
    if (!isOffCycleUpdate) {
        D.tradedRes = {};
        D.producedRes = {};
        D.producedTicks = 0;
        D.tradeAmount = 0;
    }
}

export function tickInterestRate() {
    D.cashPerSec = estimatedEarningPerSecond();
}

export function estimatedEarningPerSecond() {
    let count = 0;
    let earningPerSec = 0;
    const activeIO = activeInputOutput();
    keysOf(D.price)
        .sort((a, b) => D.price[b].price - D.price[a].price)
        .some((res) => {
            const surplus = (activeIO?.[res]?.[1] ?? 0) - getAutoSellAmountFor(res);
            if (surplus <= 0) {
                return false;
            }
            earningPerSec += Math.min(getAutoSellAmountFor(res), surplus) * D.price[res].price;
            if (++count >= D.autoSellConcurrency) {
                return true;
            }
            return false;
        });
    return earningPerSec;
}

function logPriceDiff(f: () => void) {
    if (CC_DEBUG) {
        const lastPrice: Partial<Record<keyof Resources, IPrice>> = JSON.parse(JSON.stringify(D.price));
        f();
        forEach(lastPrice, (k, v) => {
            const newPrice = D.price[k].price;
            if (v.price !== newPrice) {
                cc.log(`Price is different: ${k}. Old = ${v.price}, New = ${newPrice}, Diff = ${newPrice - v.price}`);
            }
        });
    } else {
        f();
    }
}

export function calculatePrice(
    res: keyof Resources,
    randomize: (price: number) => number,
    ignoreMap: boolean,
    printLog: boolean
): IPrice {
    if (res === "Cash") {
        return { price: 1, elasticity: 0, quantity: 0 };
    }
    if (!canPrice(res)) {
        return { price: 0, elasticity: 0, quantity: 0 };
    }
    const prices: Partial<Record<string, number>> = {};
    if (D.price[res]) {
        if ((!ignoreMap && MAP[D.map].deposits[res] > 0) || !DEP[res]) {
            return D.price[res];
        }
        prices._ = D.price[res].price;
    }
    keysOf(ORIGINAL_BLD).forEach((b) => {
        if (ORIGINAL_BLD[b].ignoreForPricing) {
            return;
        }
        const building = ORIGINAL_BLD[b];
        if (building.staticOutput[res]) {
            let priceForBuilding = 0;
            keysOf(building.staticInput).forEach((i) => {
                if (!D.price[i]) {
                    D.price[i] = calculatePrice(i, randomize, ignoreMap, printLog);
                }
                priceForBuilding += building.staticInput[i] * D.price[i].price;
            });
            if (building.staticOutput[res] > 0) {
                priceForBuilding = priceForBuilding / building.staticOutput[res];
            }
            if (priceForBuilding > 0) {
                prices[b] = priceForBuilding;
            }
        }
    });
    const priceValues = Object.values(prices);
    const price = getMedian(priceValues);
    if (printLog && priceValues.length > 1) {
        cc.log(`${res} = ${price}`, prices);
    }
    const p = randomize(price);
    return {
        price: p,
        elasticity: calculateElasticity(res, p),
        quantity: 0,
    };
}

function paramResourceTier(k: keyof Resources): number {
    return 10 / (G.resourceTiers[k] + 1);
}

function calculateElasticity(k: keyof Resources, price: number) {
    const totalSeconds = priceUpdateInterval() / SECOND;
    let maxProduction = D.producedRes[k] || 0;
    if (D.producedTicks > 0) {
        maxProduction = (maxProduction * totalSeconds) / D.producedTicks;
    }
    return (
        (0.5 * price * paramResourceTier(k)) /
        Math.max(getSwissMultiplier() * PRODUCTION_SCALER * totalSeconds, maxProduction)
    );
}

export function getPrice(res: keyof Resources): number {
    const p = D.price[res];
    if (!p || p.price === 0) {
        return 0;
    }
    return _getPrice(p.price, p.elasticity, p.quantity);
}

function _getPrice(price: number, elasticity: number, quantity: number): number {
    const cliff = (0.5 * price) / elasticity;
    let q: number;
    const cutoff1 = D.map === "HongKong" ? 1.2 : 1.1;
    const cutoff2 = D.map === "HongKong" ? 1.1 : 1.05;
    const cutoff3 = D.map === "HongKong" ? 0.95 : 0.9;
    const cutoff4 = D.map === "HongKong" ? 0.9 : 0.85;
    if (quantity > cliff) {
        // Shift down
        q = Math.pow(quantity, cutoff1) - (Math.pow(cliff, cutoff1) - Math.pow(cliff, cutoff2));
    } else if (quantity > 0) {
        q = Math.pow(quantity, cutoff2);
    } else if (quantity > -cliff) {
        q = -Math.pow(Math.abs(quantity), cutoff3);
    } else {
        // Shift down
        q =
            -Math.pow(Math.abs(quantity), cutoff4) -
            (Math.pow(Math.abs(cliff), cutoff3) - Math.pow(Math.abs(cliff), cutoff4));
    }
    return cc.misc.clampf(price + elasticity * q, 0.1 * price, Infinity);
}

export function runPriceTest(): void {
    // eslint-disable-next-line @typescript-eslint/ban-types
    const result: Partial<Record<keyof Resources, Object>> = {};
    const io = stableInputOutput();
    const maxSeconds = priceUpdateInterval() / SECOND;
    forEach(D.price, (k, v) => {
        if (!canPrice(k) || io[k][1] <= 0) {
            return;
        }
        result[k] = {
            price: v.price,
            elasticity: v.elasticity,
            output: io[k][1],
            sMax10: _getPrice(v.price, v.elasticity, -io[k][1] * maxSeconds * 10) / v.price,
            sMax2: _getPrice(v.price, v.elasticity, -io[k][1] * maxSeconds * 2) / v.price,
            sMax: _getPrice(v.price, v.elasticity, -io[k][1] * maxSeconds) / v.price,
            sMax0_5: _getPrice(v.price, v.elasticity, (-io[k][1] * maxSeconds) / 2) / v.price,
            // s100M: _getPrice(v.price, v.elasticity, -1e8) / v.price,
            // s10M: _getPrice(v.price, v.elasticity, -1e7) / v.price,
            // s100K: _getPrice(v.price, v.elasticity, -1e5) / v.price,
            // s1K: _getPrice(v.price, v.elasticity, -1e3) / v.price,
            // b1K: _getPrice(v.price, v.elasticity, 1e3) / v.price,
            // b100K: _getPrice(v.price, v.elasticity, 1e5) / v.price,
            // b10M: _getPrice(v.price, v.elasticity, 1e7) / v.price,
            // b100M: _getPrice(v.price, v.elasticity, 1e8) / v.price,
            bMax0_5: _getPrice(v.price, v.elasticity, (io[k][1] * maxSeconds) / 2) / v.price,
            bMax: _getPrice(v.price, v.elasticity, io[k][1] * maxSeconds) / v.price,
            bMax2: _getPrice(v.price, v.elasticity, io[k][1] * maxSeconds * 2) / v.price,
            bMax10: _getPrice(v.price, v.elasticity, io[k][1] * maxSeconds * 10) / v.price,
        };
    });
    console.table(result);
}

export function cashForBuyOrSell(res: keyof Resources, amount: number) {
    const originalQuantity = D.price[res].quantity;
    const batchCount = cc.misc.clampf(amount / 1000, 10, 1000);
    const batchSize = amount / batchCount;
    let cash = 0;
    for (let i = 0; i < batchCount; i++) {
        D.price[res].quantity += batchSize;
        cash += batchSize * getPrice(res);
    }
    D.price[res].quantity = originalQuantity;
    return -cash;
}

// buy 100, sell -100
export function tryBuyOrSell(res: keyof Resources, amount: number): boolean {
    if (amount === 0) {
        return true;
    }
    const tc = G.tradeCenter;
    const cash = cashForBuyOrSell(res, amount);
    if (cash === 0) {
        return false;
    }
    if (!tc.resources[res]) {
        tc.resources[res] = 0;
    }
    if (tc.resources.Cash + cash >= 0 && tc.resources[res] + amount >= 0) {
        D.price[res].quantity += amount;
        tc.resources.Cash += cash;
        tc.resources[res] += amount;
        T.res[res] += amount;
        return true;
    } else {
        return false;
    }
}
