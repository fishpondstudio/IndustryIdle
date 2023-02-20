import { allResourcesValue, allResourcesValueForReference, getCash } from "../CoreGame/Logic/Logic";
import { ILocalTrade, ITrade, onMyTradesUpdate } from "../CoreGame/Logic/PlayerTrade";
import { Resources } from "../CoreGame/ResourceDefinitions";
import { DE } from "../Languages/de";
import { EN } from "../Languages/en";
import { ES } from "../Languages/es";
import { FR } from "../Languages/fr";
import { JP } from "../Languages/jp";
import { KR } from "../Languages/kr";
import { RU } from "../Languages/ru";
import { Streaming } from "../UI/StreamingPage";
import { showAlert, showToast } from "../UI/UISystem";
import { API_HOST, D, G, getCurrentVersion, T } from "./GameData";
import { forEach, getAlphaNumeric, getDebugUrlParams, hasValue, SECOND, selectOf, sizeOf } from "./Helper";
import { t } from "./i18n";
import { isSteam, NativeSdk, steamworks } from "./NativeSdk";
import { serverNow, setServerClock } from "./ServerClock";
import { TypedEvent } from "./TypedEvent";

export interface IChatMessage extends IMessage {
    user: string;
    message: string;
    dlc: number;
    flag: string;
    channel: string;
}

interface IJoinMessage extends IMessage {
    messages: IChatMessage[];
}

interface ITradeMessage extends IMessage {
    flush?: Record<string, ITrade>;
    add?: Record<string, ITrade>;
    delete?: Record<string, Record<string, never>>;
    myTrades: Record<string, ILocalTrade>;
    error?: string;
    id?: string;
}

interface IMessage {
    type: "join" | "chat" | "trade" | "tick" | "logout" | "pledge" | "export" | "signal" | "streaming" | "tradeFine";
    id?: string;
    time?: number;
    auth?: boolean;
    isMod?: boolean;
    [k: string]: any;
}

export interface IPledge {
    resource: keyof Resources;
    index: number;
    amount: number;
}

export interface IPledgeMessage extends IMessage {
    pledge: Record<number, IPledge[]>;
}

export interface ISignalMessage extends IMessage {
    fromUserId: string;
    toUserId: string;
}

export interface IPledgeResponse extends IMessage {
    pledge: Record<string, number>;
}

interface ILocalMessage extends IMessage {
    id?: string;
    // eslint-disable-next-line @typescript-eslint/ban-types
    resolve?: Function;
    // eslint-disable-next-line @typescript-eslint/ban-types
    reject?: Function;
}

let authenticated = false;

export function isAuthenticated() {
    return authenticated;
}

const TICK_FREQ = 60 * 1000;
const MAX_MESSAGES = 100;
export const BLOCKED_USERS: Record<string, true> = {};

export interface ITradeFine {
    playerName: string;
    numberOfTrades: number;
    profit: number;
}

export class Socket {
    public chatMessages: IChatMessage[] = [];
    public myTrades: Record<string, ILocalTrade> = {};
    public activeTrades: Record<string, ITrade> = {};
    public pendingTradeFines: ITradeFine[] = [];
    public pledge: Record<string, number> = {};
    public bestBids: Partial<Record<keyof Resources, number>> = {};
    public bestAsks: Partial<Record<keyof Resources, number>> = {};
    public resourceTrades: Partial<Record<keyof Resources, number>> = {};
    public isMod = false;

    public readonly onChatUpdate = new TypedEvent<void>();
    public readonly onSignalMessage = new TypedEvent<IMessage>();

    private _ws: WebSocket;
    private _sendQueue: Record<string, ILocalMessage> = {};
    private _connecting: Promise<void>;
    private _retryCount = 0;
    private _lastMessageAt = 0;

    constructor() {
        setInterval(this.tick.bind(this), TICK_FREQ);
    }

    private tick() {
        if (T.tickCount <= 1) {
            return;
        }
        if (serverNow() - this._lastMessageAt > TICK_FREQ + 10 * SECOND) {
            // This should force retry
            this._ws.close();
            return;
        }
        this.send({ type: "tick", ...getTickMessage() }).catch((e) => cc.error(e));
    }

    public isConnected(): boolean {
        return this._ws && this._ws.readyState === this._ws.OPEN;
    }

    public disconnect() {
        if (this._ws) {
            this._ws.onopen = null;
            this._ws.onclose = null;
            this._ws.onmessage = null;
            this._ws.close();
        }
    }

    public async connect(): Promise<void> {
        const ticket = await NativeSdk.getAuthTicket();
        const appId = isSteam() ? `&appId=${await steamworks.getAppId()}` : "";
        if (!this._connecting) {
            this._connecting = new Promise((resolve, reject) => {
                this.disconnect();
                try {
                    const token = ticket ? `&token=${ticket}` : "";
                    const serverOverride = getDebugUrlParams().server;
                    const url = serverOverride ? `ws://${serverOverride}` : "wss://api.fishpondstudio.com/";
                    this._ws = new WebSocket(
                        `${url}?user=${
                            D.persisted.userId
                        }${token}&platform=${NativeSdk.name().toLowerCase()}${appId}&version=${getCurrentVersion()}`
                    );
                    this._ws.onopen = (e) => {
                        this._connecting = null;
                        this._retryCount = 0;
                        this.send({
                            type: "join",
                            channel: D.persisted.chatChannel,
                            streaming: Streaming.on,
                        });
                        // Delay 5-10s to prevent overwhelm the server
                        setTimeout(this.tick.bind(this), cc.randf(5000, 10000));
                        resolve();
                    };
                    this._ws.onerror = cc.error;
                    this._ws.onclose = (e) => {
                        this._connecting = null;
                        setTimeout(() => this.connect().catch(cc.error), 1000 * Math.min(10, ++this._retryCount));
                        reject();
                    };
                    this._ws.onmessage = this.onMessage.bind(this);
                } catch (error) {
                    cc.error(error);
                    reject(error);
                }
            });
        }
        return this._connecting;
    }

    private onMessage(e: MessageEvent) {
        if (this._connecting) {
            cc.warn("Websocket received message but _connecting promise is not null!");
            this._connecting = null;
        }
        const message: IMessage = JSON.parse(e.data);
        if (hasValue(message.time)) {
            setServerClock(message.time);
        }
        if (hasValue(message.auth)) {
            authenticated = message.auth;
        }
        if (message.isMod) {
            G.socket.isMod = true;
        } else {
            G.socket.isMod = false;
        }
        this._lastMessageAt = serverNow();
        switch (message.type) {
            case "join":
                this.handleJoin(message as IJoinMessage);
                break;
            case "chat":
                this.handleChat(message as IChatMessage);
                break;
            case "trade":
                this.handleTrade(message as ITradeMessage);
                break;
            case "logout":
                this.handleLogout(message as ITradeMessage);
                break;
            case "pledge":
                this.handlePledge(message as IPledgeResponse);
                break;
            case "export":
                this.handleExport(message as IPledgeResponse);
                break;
            case "signal":
                this.onSignalMessage.emit(message);
                break;
            case "streaming":
                this.handleStreaming(message);
                break;
            case "tradeFine":
                this.handleTradeFine(message);
                break;
            default:
                cc.warn("Unknown message:", message);
        }
        if (message.id && this._sendQueue[message.id]) {
            message.error
                ? this._sendQueue[message.id].reject?.(new Error(message.error))
                : this._sendQueue[message.id].resolve?.();
            delete this._sendQueue[message.id];
        }
    }

    private handleStreaming(message: IMessage) {
        if (message.users) {
            Streaming.users = message.users;
        }
        if (message.token) {
            Streaming.token = message.token;
        }
    }

    private handleTradeFine(message: IMessage) {
        if (message.fines) {
            G.socket.pendingTradeFines = message.fines;
        }
    }

    private handleExport(message: IPledgeResponse) {
        this.send({ type: "export", data: D });
    }

    private handlePledge(resp: IPledgeResponse) {
        this.pledge = resp.pledge;
    }

    private async handleLogout(message: ITradeMessage) {
        cc.game.pause();
        this.disconnect();
        G.audio.playError();
        showAlert(t("Logout"), t("LogoutDescV2"), [
            {
                class: "outline red",
                name: t("LogBackIn"),
                action: () => {
                    window.location.reload();
                },
            },
        ]);
    }

    private handleTrade(payload: ITradeMessage) {
        if (payload.token) {
            D.persisted.tradeToken = payload.token;
        }
        if (payload.myTrades) {
            onMyTradesUpdate(this.myTrades, payload.myTrades);
            this.myTrades = payload.myTrades;
        }
        if (payload.flush) {
            this.activeTrades = payload.flush;
        } else {
            if (payload.add) {
                forEach(payload.add, (k, v) => {
                    this.activeTrades[k] = v;
                });
            }
            if (payload.delete) {
                forEach(payload.delete, (k, _) => {
                    delete this.activeTrades[k];
                });
            }
        }
        this.updateBestPrice();
    }

    private updateBestPrice() {
        this.bestAsks = {};
        this.bestBids = {};
        this.resourceTrades = {};
        forEach(this.activeTrades, (id, trade) => {
            if (trade.side === "buy") {
                if (!this.bestBids[trade.resource] || trade.price > this.bestBids[trade.resource]) {
                    this.bestBids[trade.resource] = trade.price;
                }
            }
            if (trade.side === "sell") {
                if (!this.bestAsks[trade.resource] || trade.price < this.bestAsks[trade.resource]) {
                    this.bestAsks[trade.resource] = trade.price;
                }
            }
            if (!this.resourceTrades[trade.resource]) {
                this.resourceTrades[trade.resource] = 1;
            } else {
                this.resourceTrades[trade.resource]++;
            }
        });
    }

    private handleChat(payload: IChatMessage) {
        if (BLOCKED_USERS[payload.user]) {
            return;
        }
        if (this.chatMessages.length >= MAX_MESSAGES) {
            this.chatMessages.shift();
        }
        this.chatMessages.push(processChatMessage(payload));
        if (!D.persisted.hideChatMentions && mentionsMe(payload)) {
            G.audio.playBubble();
            showToast(t("NewMessageMentions", { message: payload.message }));
        }
        this.onChatUpdate.emit();
    }

    private handleJoin(payload: IJoinMessage) {
        this.chatMessages = payload.messages.map((m) => processChatMessage(m));
        this.onChatUpdate.emit();
    }

    public send<T extends ILocalMessage>(message: T): Promise<void> {
        const json = JSON.stringify(message);
        if (message.id) {
            const toQueue: T = JSON.parse(json);
            const promise = new Promise<void>((resolve, reject) => {
                toQueue.resolve = resolve;
                toQueue.reject = reject;
                this._sendQueue[toQueue.id] = toQueue;
            });
            forEach(this._sendQueue, (k, v) => {
                if (!this._send(JSON.stringify(v))) {
                    v.reject?.(new Error(t("ServerDisconnected")));
                    delete this._sendQueue[k];
                }
            });
            return promise;
        }
        return this._send(json) ? Promise.resolve() : Promise.reject();
    }

    private _send(data: string): boolean {
        if (this._ws.readyState === this._ws.OPEN) {
            this._ws.send(data);
            return true;
        }
        return false;
    }
}

function processChatMessage(message: IChatMessage): IChatMessage {
    if (/\p{Extended_Pictographic}/u.test(message.user)) {
        message.mod = true;
        message.user = message.user.replace(/([^a-z0-9]+)/gi, "");
    }
    return message;
}

export function mentionsMe(chat: IChatMessage) {
    return (
        chat.message.includes(`@${getAlphaNumeric(D.persisted.userName)}`) ||
        (chat.ip && chat.message.toLowerCase().includes("@mod"))
    );
}

export const CHAT_CHANNEL = {
    en: {
        name: EN.ThisLanguage,
    },
    zh: {
        name: "中文",
    },
    de: {
        name: DE.ThisLanguage,
    },
    fr: {
        name: FR.ThisLanguage,
    },
    es: {
        name: ES.ThisLanguage,
    },
    pt: {
        name: "Português",
    },
    ru: {
        name: RU.ThisLanguage,
    },
    jp: {
        name: JP.ThisLanguage,
    },
    kr: {
        name: KR.ThisLanguage,
    },
};

export function getTickMessage() {
    const resources = selectOf(T.res, (_, v) => v > 0);
    // Rewind trades
    forEach(G.socket.myTrades, (id, trade) => {
        if (trade.side === "buy") {
            if (!resources.Cash) {
                resources.Cash = 0;
            }
            resources.Cash += trade.amount * trade.price;
        }
        if (trade.side === "sell") {
            if (!resources[trade.resource]) {
                resources[trade.resource] = 0;
            }
            resources[trade.resource] += trade.amount;
        }
    });
    // Rewind crowdfunding
    forEach(D.crowdfunding, (_, cf) => {
        if (!resources.Cash) {
            resources.Cash = 0;
        }
        resources.Cash += cf.value;
    });
    return {
        prestigeCurrency: D.persisted.prestigeCurrency,
        allPrestigeCurrency: D.persisted.allPrestigeCurrency,
        cash: getCash(),
        resourceValuation: allResourcesValue(),
        resourceValuationForReference: allResourcesValueForReference(),
        buildingValuation: D.cashSpent,
        map: D.map,
        price: D.price,
        mapCreatedAt: D.mapCreatedAt,
        buildingCount: sizeOf(D.buildings),
        dlc: sizeOf(D.persisted.dlc),
        flag: D.persisted.flag,
        userName: D.persisted.userName,
        res: resources,
        optOut: D.persisted.leaderboardOptOut,
    } as const;
}

export function resolveTradeFine(tradeFine: ITradeFine): Promise<Response> {
    return fetch(`${API_HOST}/trade/resolve-fine`, {
        method: "post",
        headers: { "X-User-Id": D.persisted.userId, "Content-Type": "application/json" },
        body: JSON.stringify({
            tradeFine,
            tick: getTickMessage(),
        }),
    });
}
