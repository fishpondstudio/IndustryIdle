import { D, G, signTrade } from "../../General/GameData";
import { assert, forEach, murmurhash3, nf, safeAdd, sizeOf, uuidv4 } from "../../General/Helper";
import { t } from "../../General/i18n";
import { serverNow } from "../../General/ServerClock";
import { showToast } from "../../UI/UISystem";
import { Resources } from "../ResourceDefinitions";
import {
    addCash,
    addResourceTo,
    CROP,
    getMarketCap,
    refundResource,
    RES,
    tradeCenterRes,
    tryDeductCash,
    tryDeductResource,
} from "./Logic";
import { getPrice } from "./Price";
import { getOutputAmount } from "./Production";

export type OrderStatus = "open" | "filled" | "closed";
export type OrderSide = "buy" | "sell";

export interface ILocalTrade extends ITradeRequest {
    type: "trade";
    fromUserId: string;
    createdAt: number;
    sig: string;
}

export interface ITrade {
    id: string;
    from: string;
    fromUserHash: string;
    side: OrderSide;
    resource: keyof Resources;
    amount: number;
    price: number;
    fillBy: string;
    status: OrderStatus;
}

export interface ITradeRequest extends ITrade {
    type: "trade";
    sig: string;
    token: string;
}

export function maxActiveTrades() {
    const dlcCount = sizeOf(D.persisted.dlc);
    let result = 0;
    switch (dlcCount) {
        case 0:
            result = 2;
            break;
        case 1:
            result = 6;
            break;
        case 2:
            result = 8;
            break;
    }
    if (D.map === "HongKong") {
        result *= 1.5;
    }
    return result;
}

export function getOrderSides(): Record<OrderSide, string> {
    return {
        sell: t("PlayerTradeSell"),
        buy: t("PlayerTradeBuy"),
    };
}

export function calcUserHash(userId: string): string {
    return murmurhash3(userId, 0x123456789).toString(16);
}

export function newTrade(): ILocalTrade {
    return {
        id: uuidv4(),
        side: "sell",
        type: "trade",
        fromUserId: D.persisted.userId,
        fromUserHash: calcUserHash(D.persisted.userId),
        from: D.persisted.userName,
        resource: null,
        amount: 0,
        price: 0,
        status: "open",
        fillBy: null,
        sig: "",
        createdAt: serverNow(),
        token: D.persisted.tradeToken,
    };
}

function _errorMessage(err: any): string {
    if (err && err.message) {
        return ": " + err.message;
    } else {
        return "";
    }
}

export function isBetterThanMarket(trade: ITrade) {
    return trade.side === "sell" ? trade.price <= getPrice(trade.resource) : trade.price >= getPrice(trade.resource);
}

export async function addTrade(trade: ILocalTrade) {
    const tradeBeforeTax = { ...trade };
    trade.amount = taxCalculation(tradeBeforeTax).amountAfterTax;
    /////////////////// Need rollback!
    if (tradeBeforeTax.side === "sell") {
        if (!tryDeductResource(tradeBeforeTax.resource, tradeBeforeTax.amount)) {
            throw new Error(t("NotEnoughResources"));
        }
    }
    if (tradeBeforeTax.side === "buy") {
        if (!tryDeductCash(tradeBeforeTax.price * tradeBeforeTax.amount)) {
            throw new Error(t("NotEnoughCash"));
        }
    }
    //////////////////////////////////
    try {
        trade.createdAt = serverNow();
        await G.socket.send(signTrade(trade));
        useTaxCredit(tradeBeforeTax);
    } catch (err) {
        if (tradeBeforeTax.side === "sell") {
            refundResource(tradeBeforeTax.resource, tradeBeforeTax.amount);
        }
        if (tradeBeforeTax.side === "buy") {
            addCash(tradeBeforeTax.price * tradeBeforeTax.amount);
        }
        throw new Error(t("AddTradeFail") + _errorMessage(err));
    }
}

export async function acceptTrade(trade: ITrade) {
    const tc = tradeCenterRes(trade.resource);
    const tradeBeforeTax = { ...trade };
    trade.amount = taxCalculation(tradeBeforeTax).amountAfterTax;
    if (trade.status !== "open" || G.socket.myTrades[trade.id]) {
        throw new Error(t("AcceptTradeFail"));
    }
    if (trade.amount < 1) {
        throw new Error(t("PlayerTradeAmountNotValidV2"));
    }
    /////////////////// Need rollback!
    if (tradeBeforeTax.side === "sell") {
        if (!tryDeductCash(tradeBeforeTax.amount * tradeBeforeTax.price)) {
            G.audio.playError();
            throw new Error(t("NotEnoughCash"));
        }
        tc[tradeBeforeTax.resource] += trade.amount;
    }
    if (tradeBeforeTax.side === "buy") {
        if (!tryDeductResource(tradeBeforeTax.resource, tradeBeforeTax.amount)) {
            G.audio.playError();
            throw new Error(t("NotEnoughResources"));
        }
        addCash(trade.amount * trade.price);
    }
    //////////////////////////////////
    try {
        const request = trade as ITradeRequest;
        request.type = "trade";
        request.status = "filled";
        request.fillBy = D.persisted.userName;

        await G.socket.send(signTrade(request));
        useTaxCredit(tradeBeforeTax);
        if (D.tradeAmountPerPlayer[trade.fromUserHash]) {
            D.tradeAmountPerPlayer[trade.fromUserHash] += trade.amount * trade.price;
        } else {
            D.tradeAmountPerPlayer[trade.fromUserHash] = trade.amount * trade.price;
            if (D.swissBoosts.researchAgreement) {
                const output = getOutputAmount(G.researchLab, "RP");
                addResourceTo(G.researchLab, "RP", output * 10 * 60);
            }
        }
    } catch (err) {
        if (tradeBeforeTax.side === "sell") {
            addCash(tradeBeforeTax.amount * tradeBeforeTax.price);
            tc[tradeBeforeTax.resource] -= trade.amount;
        }
        if (tradeBeforeTax.side === "buy") {
            assert(tryDeductCash(trade.amount * trade.price), "We should have enough cash here!");
            refundResource(tradeBeforeTax.resource, tradeBeforeTax.amount);
        }
        throw new Error(t("AcceptTradeFail") + _errorMessage(err));
    }
}

export async function claimTrade(trade: ILocalTrade) {
    if (trade.status !== "filled" || !G.socket.myTrades[trade.id]) {
        throw new Error(t("ClaimTradeFail"));
    }
    try {
        const newTrade: ILocalTrade = {
            ...trade,
            status: "closed",
        };
        await G.socket.send(signTrade(newTrade));
        if (trade.side === "sell") {
            addCash(trade.amount * trade.price);
        }
        if (trade.side === "buy") {
            const tc = tradeCenterRes(trade.resource);
            tc[trade.resource] += trade.amount;
        }
    } catch (err) {
        throw new Error(t("ClaimTradeFail") + _errorMessage(err));
    }
}

export const REFUND_PERCENT = 1;

export async function cancelTrade(trade: ILocalTrade) {
    if (trade.status !== "open" || trade.fromUserId !== D.persisted.userId) {
        throw new Error(t("CancelTradeFail"));
    }
    try {
        const newTrade: ILocalTrade = {
            ...trade,
            status: "closed",
        };
        await G.socket.send(signTrade(newTrade));
        trade = newTrade;
        if (trade.side === "sell") {
            refundResource(trade.resource, trade.amount * REFUND_PERCENT);
        }
        if (trade.side === "buy") {
            addCash(trade.amount * trade.price);
        }
    } catch (err) {
        throw new Error(t("CancelTradeFail") + _errorMessage(err));
    }
}

export function getClaimableTradeCount(trades: Record<string, ITrade>): number {
    if (typeof trades !== "object") {
        return 0;
    }
    return Object.keys(trades).filter((k) => trades[k].status === "filled").length;
}

// Open, filled or cancelled
export function hasActiveTrades(): boolean {
    return !cc.js.isEmptyObject(G.socket.myTrades);
}

export const QUOTA_PERCENT = 0.01;

export function getMarketCapTaxCreditPercent() {
    return QUOTA_PERCENT + D.persisted.extraTradeQuota / 100 + D.swissBoosts.extraTradeQuota / 100;
}

export function getMarketCapBasedTaxCredit(): [number, number] {
    return [getMarketCap() * getMarketCapTaxCreditPercent(), D.tradeAmount];
}

export function getTaxRate(res: keyof Resources, price: number): number {
    const localPrice = D.price[res]?.price ?? 0;
    const diff = Math.abs((price - localPrice) / localPrice);
    let taxRate = 1;
    if (diff <= 0.5) {
        taxRate = diff * 0.5;
    } else if (diff <= 0.75) {
        taxRate = 0.25 + (diff - 0.5);
    } else {
        taxRate = 0.5 + 2 * (diff - 0.75);
    }
    return cc.misc.clamp01(taxRate);
}

export function hasTradedTooMuchWith(userId: string, valueOfTrade: number): boolean {
    return (D.tradeAmountPerPlayer[userId] ?? 0) + valueOfTrade > 0.1 * getMarketCap();
}

export function getProductionBasedTaxCredit(resource: keyof Resources, price: number): [number, number] {
    const resourceProduced = D.producedRes[resource] ?? 0;
    const resourceTraded = D.tradedRes[resource] ?? 0;
    let priceFactor = 1;
    if (D.map === "Vancouver" && (resource === "U" || resource === "ErU")) {
        priceFactor *= 2;
    }
    if (D.map === "KansasCity" && CROP[resource]) {
        priceFactor *= 2;
    }
    if (D.map === "RioDeJaneiro" && (resource === "FPork" || resource === "FzCkn" || resource === "CBeef")) {
        priceFactor *= 2;
    }
    return [resourceProduced * price * priceFactor, resourceTraded * price];
}

export interface ITaxCalculable {
    resource: keyof Resources;
    amount: number;
    price: number;
}

export function useTaxCredit(params: ITaxCalculable): void {
    const { resource, amount, price } = params;
    const [productionCredit, productionCreditUsed] = getProductionBasedTaxCredit(resource, price);
    const availableProductionCredit = productionCredit - productionCreditUsed;
    if (availableProductionCredit >= amount * price) {
        safeAdd(D.tradedRes, resource, amount);
        return;
    }
    cc.log(availableProductionCredit, availableProductionCredit / price);
    safeAdd(D.tradedRes, resource, availableProductionCredit / price);
    const remaining = amount * price - availableProductionCredit / price;
    const [marketCapCredit, marketCapCreditUsed] = getMarketCapBasedTaxCredit();
    if (marketCapCredit - marketCapCreditUsed >= remaining) {
        D.tradeAmount += remaining;
        return;
    }
    D.tradeAmount += marketCapCredit;
}

export function taxCalculation(params: ITaxCalculable) {
    const { resource, amount, price } = params;
    assert(!!RES[resource], "taxCalculation: resource should exist");
    assert(price > 0, `taxCalculation: price = ${price} > 0`);
    const [taxCreditProduction, taxCreditProductionUsed] = getProductionBasedTaxCredit(resource, price);
    const [taxCreditMarketCap, taxCreditMarketCapUsed] = getMarketCapBasedTaxCredit();

    const valueBeforeTax = amount * price;
    const taxCreditProductionAvailable = cc.misc.clampf(taxCreditProduction - taxCreditProductionUsed, 0, Infinity);
    const taxCreditMarketCapAvailable = cc.misc.clampf(taxCreditMarketCap - taxCreditMarketCapUsed, 0, Infinity);
    const totalTaxCreditAvailable = taxCreditProductionAvailable + taxCreditMarketCapAvailable;
    const taxableValue = cc.misc.clampf(valueBeforeTax - totalTaxCreditAvailable, 0, Infinity);
    const taxRate = getTaxRate(resource, price);
    const taxPayable = taxRate * taxableValue;
    const taxRateApplied = taxPayable == 0 || valueBeforeTax == 0 ? 0 : taxPayable / valueBeforeTax;
    const taxPayableInAmount = taxPayable / price;
    const valueAfterTax = amount * price - taxPayable;
    const amountAfterTax = valueAfterTax / price;
    return {
        taxCreditProduction,
        taxCreditProductionUsed,
        taxCreditMarketCap,
        taxCreditMarketCapUsed,
        totalTaxCreditAvailable,
        valueBeforeTax,
        taxCreditProductionAvailable,
        taxCreditMarketCapAvailable,
        taxableValue,
        taxRate,
        taxPayable,
        taxRateApplied,
        taxPayableInAmount,
        valueAfterTax,
        amountAfterTax,
    };
}

export const ClaimConfig = {
    autoClaim: D.persisted.autoClaimTradeOrder,
    claimed: {},
};

export function onMyTradesUpdate(myOldTrades: Record<string, ILocalTrade>, myNewTrades: Record<string, ILocalTrade>) {
    // How this works:
    // claimTrade will cause this handler to be called again. So we only fill one trade and return
    // this will ensure all fill trade requests have the valid trade token
    if (ClaimConfig.autoClaim) {
        forEach(myNewTrades, (id, trade) => {
            if (trade.status === "filled" && !ClaimConfig.claimed[id]) {
                ClaimConfig.claimed[id] = true;
                claimTradeUI(trade);
                return true;
            }
            return false;
        });
    } else {
        const count = getClaimableTradeCount(myNewTrades);
        if (count > getClaimableTradeCount(myOldTrades)) {
            G.audio.playEffect(G.audio.completed);
            showToast(t("PlayerTradeToClaim", { num: count }));
        }
    }
}

export async function claimTradeUI(trade: ILocalTrade) {
    try {
        await claimTrade(trade);
        G.audio.playEffect(G.audio.kaching);
        showToast(
            t("ClaimTradeSuccessV2", {
                cashOrResource:
                    trade.side === "sell"
                        ? `${RES.Cash.name()} +${nf(trade.amount * trade.price)}`
                        : `${RES[trade.resource].name()} +${nf(trade.amount)}`,
            })
        );
        m.redraw();
    } catch (error) {
        G.audio.playError();
        showToast(error?.message);
    }
}
