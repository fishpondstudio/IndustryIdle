import { getCash, getPrestigeCurrency, getResDiff, RES, visibleResources } from "../CoreGame/Logic/Logic";
import { getClaimableTradeCount } from "../CoreGame/Logic/PlayerTrade";
import { getPowerBalance } from "../CoreGame/Logic/Production";
import { SCENES } from "../General/Constants";
import { D, G, T } from "../General/GameData";
import { getOrSet, hasValue, ifTrue, nf, numberSign } from "../General/Helper";
import { t } from "../General/i18n";
import { isAndroid, isIOS } from "../General/NativeSdk";
import { ChatPage, getChatHead } from "./ChatPage";
import { standbyModeAvailable } from "./DisplaySettingsPage";
import { Streaming } from "./StreamingPage";
import { iconB, leftOrRight, switchScene } from "./UIHelper";
import { routeTo, showStandby, showToast } from "./UISystem";

const left = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--sail"), 10) || 0;
const right = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--sair"), 10) || 0;
let lastLeftOrRight = "right";

export function HudPage(): m.Comp {
    return {
        onupdate: () => {
            G.onRedraw.emit();
        },
        view: () => {
            if (cc.director.getScene().name === SCENES.Main || cc.director.getScene().name === SCENES.Conglomerate) {
                return renderMainTopbar();
            }
            if (cc.director.getScene().name === SCENES.World) {
                return renderWorldMapTopbar();
            }
            return null;
        },
    };
}

function renderMainTopbar() {
    const resCount = Math.floor(((cc.game.canvas.width - left - right) / cc.view.getDevicePixelRatio() - 350) / 150);
    const power = getPowerBalance();
    const cashDiff = getResDiff("Cash");
    const fuelDiff = getResDiff(D.fuelResType);
    lastLeftOrRight = leftOrRight(lastLeftOrRight);
    return [
        m(
            ".video-container",
            {
                class: `${lastLeftOrRight} ${Streaming.showVideo ? "" : "hide"}`,
            },
            [
                m("video", {
                    id: "video-stream",
                    playsinline: true,
                    autoplay: true,
                    muted: true,
                    onenterpictureinpicture: (e) => {
                        Streaming.showVideo = false;
                    },
                    onleavepictureinpicture: (e) => {
                        Streaming.showVideo = hasValue(Streaming.watching);
                    },
                }),
                m(
                    ".video-overlay",
                    {
                        onclick: () => {
                            const v = document.querySelector<HTMLVideoElement>("#video-stream");
                            try {
                                v.requestPictureInPicture();
                            } catch (error) {
                                showToast(t("GeneralServerErrorMessage", { error: error?.message }));
                            }
                        },
                    },
                    iconB("open_in_new")
                ),
            ]
        ),
        m(".hud", [
            m(
                ".res-left.pointer",
                {
                    onclick: () => {
                        G.world.clearSelection();
                        G.world.routeTo(G.statBureau.grid);
                    },
                },
                [
                    `💰 ${nf(getCash())} `,
                    m(
                        ".diff",
                        { class: cashDiff >= 0 ? "green" : "red" },
                        `${numberSign(cashDiff)}${nf(Math.abs(cashDiff))}`
                    ),
                    m("span.ml15", `⚡ `),
                    m("span", { class: power > 0 ? "green" : "red" }, `${nf(power, true)}W`),
                    m("span.ml15", `⛽ `),
                    m("span", { class: fuelDiff >= 0 ? "green" : "red" }, `${nf(fuelDiff)}/s`),
                ]
            ),
            m(
                ".res-right.pointer",
                {
                    onclick: () => {
                        G.world.clearSelection();
                        G.world.routeTo(G.tradeCenter.grid);
                    },
                },
                [
                    visibleResources()
                        .sort()
                        .filter((r) => r !== "Cash" && !D.hideResourcesInTopBar[r])
                        .slice(0, resCount)
                        .map((k) => {
                            const diff = getResDiff(k);
                            return m(
                                ".res",
                                {
                                    title: RES[k].name(),
                                },
                                [
                                    `${k} ${nf(getOrSet(T.res, k, 0))} `,
                                    m(
                                        ".diff",
                                        {
                                            class: diff >= 0 ? "green" : "red",
                                        },
                                        `${numberSign(diff)}${nf(Math.abs(diff))}`
                                    ),
                                ]
                            );
                        }),
                ]
            ),
        ]),
        renderToolbar(),
    ];
}

function renderWorldMapTopbar() {
    const prestigeCurrency = getPrestigeCurrency();
    return m(
        ".hud",
        m(".row.f1.mh15.uppercase", [
            m("div", [t("PrestigeCurrency"), " ", nf(D.persisted.prestigeCurrency)]),
            m(".f1.text-center", t("PrestigeDesc", { money: nf(prestigeCurrency) })),
            m(
                ".pointer.row",
                {
                    onclick: () => {
                        switchScene(SCENES.Main);
                    },
                },
                t("PrestigeGoBack")
            ),
        ])
    );
}

export const Desktop: {
    showChat: boolean;
    secondaryPage: m.Comp<{ docked: boolean }>;
} = {
    showChat: false,
    secondaryPage: null,
};

export function goToChat() {
    if (isIOS() || isAndroid()) {
        routeTo("/chat", { left: lastLeftOrRight === "left" ? 1 : 0 });
    } else {
        Desktop.showChat = !Desktop.showChat;
    }
}

function renderToolbar() {
    const message = G.socket.chatMessages[G.socket.chatMessages.length - 1];
    let chatMessage = null;
    if (!D.persisted.hideChat) {
        const messageContent = message
            ? [m(".row.text-s.text-desc.uppercase", getChatHead(message)), m("div", message.message)]
            : [m("div", [m(".text-s.text-desc.uppercase", t("NoMessages")), m("div", t("NoMessages"))])];
        chatMessage = [
            m(".item", { class: G.socket.isConnected() ? "green" : "red" }, iconB("circle", 16)),
            m(".item.chat-message.pointer", { onclick: goToChat }, messageContent),
        ];
    } else {
        chatMessage = m(".item.pointer", { onclick: goToChat }, "💬");
    }
    const tradeCount = getClaimableTradeCount(G.socket.myTrades);
    return m(
        ".toolbar",
        {
            class: `${lastLeftOrRight} ${D.persisted.hideChat ? "no-chat" : ""}`,
        },
        [
            chatMessage,
            m(
                ".item.pointer",
                {
                    onclick: () => G.world.routeTo(G.headquarter.grid),
                },
                "⚙️"
            ),
            ifTrue(!D.persisted.leaderboardOptOut, () =>
                m(
                    ".item.pointer.icon",
                    {
                        onclick: () => {
                            G.world.clearSelection();
                            routeTo("/player-trade");
                        },
                    },
                    ["🛒", tradeCount > 0 ? m("div", tradeCount) : null]
                )
            ),
            m(
                ".item.pointer",
                {
                    onclick: () => G.world.goBackToHq(),
                },
                "🏠"
            ),
            ifTrue(standbyModeAvailable() && D.persisted.showStandbyModeInToolbar, () =>
                m(
                    ".item.pointer",
                    {
                        onclick: showStandby,
                    },
                    "🔌"
                )
            ),
            Desktop.showChat ? m(ChatPage, { docked: true }) : null,
            Desktop.secondaryPage != null ? m(Desktop.secondaryPage, { docked: true }) : null,
        ]
    );
}
