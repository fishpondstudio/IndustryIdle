import { BAD_WORDS } from "../General/Badwords";
import { D, G, hasAnyDlc, muteUser } from "../General/GameData";
import {
    getAlphaNumeric,
    getFlagUrl,
    getResourceUrl,
    HOUR,
    ifTrue,
    keysOf,
    MINUTE,
    SECOND,
    sizeOf,
} from "../General/Helper";
import { t } from "../General/i18n";
import { NativeSdk } from "../General/NativeSdk";
import { BLOCKED_USERS, CHAT_CHANNEL, IChatMessage, mentionsMe } from "../General/Socket";
import { flagToName } from "./ChooseFlagPage";
import { Desktop } from "./HudPage";
import { iconB, leftOrRight, uiHeaderAction, uiHeaderRoute } from "./UIHelper";
import { hideAlert, showAlert, showToast } from "./UISystem";

let lastSendAt = 0;
let messageToSend = "";
let forceScroll = false;
const MAX_CHAT_CHAR = 200;

export function ChatPage(): m.Comp<{ docked: boolean }> {
    let autoScroll = true;
    let chatHasUpdate = false;
    let loadedImages: Record<string, true> = {};
    function sendMessage() {
        messageToSend = messageToSend.trim();
        if (!messageToSend) {
            return;
        }
        const now = Date.now();
        if (!hasAnyDlc() && now - lastSendAt < 10 * SECOND) {
            showToast(t("ChatMessageRateLimit"));
            return;
        }
        lastSendAt = now;
        G.socket
            .send<IChatMessage>({
                type: "chat",
                user: D.persisted.userName,
                dlc: sizeOf(D.persisted.dlc),
                flag: D.persisted.flag,
                message: messageToSend.replace(BAD_WORDS, (str) => Array(str.length + 1).join("*")),
                channel: D.persisted.chatChannel,
            })
            .catch(() => {
                G.audio.playError();
                showToast(t("ServerDisconnected"));
            });
        G.socket.onChatUpdate.once(() => m.redraw());
        messageToSend = "";
    }
    function withContainer(docked: boolean, content: m.Children) {
        const chatTitle = m(".row", { style: { width: "100%" } }, [
            m(
                "select.text-m",
                {
                    style: { marginLeft: docked ? "5px" : "10px" },
                    onchange: (e) => {
                        D.persisted.chatChannel = e.target.value;
                        autoScroll = true;
                        G.socket.send({
                            type: "join",
                            channel: D.persisted.chatChannel,
                        });
                        G.socket.chatMessages = [];
                        loadedImages = {};
                        G.socket.onChatUpdate.once(() => m.redraw());
                    },
                },
                keysOf(CHAT_CHANNEL)
                    .sort()
                    .map((l) => {
                        return m(
                            "option",
                            {
                                key: l,
                                value: l,
                                selected: D.persisted.chatChannel === l,
                            },
                            CHAT_CHANNEL[l].name
                        );
                    })
            ),
            m("input.ml10.pointer", {
                type: "checkbox",
                title: t("ChatForceScrollDesc"),
                oninput: (e) => {
                    forceScroll = e.target.checked;
                },
                checked: forceScroll,
            }),
            m(".text-s.uppercase.ml5", { title: t("ChatForceScrollDesc") }, t("ChatForceScroll")),
            m(".f1"),
        ]);
        if (docked) {
            return m(".chat-desktop-container", [uiHeaderAction(chatTitle, () => (Desktop.showChat = false)), content]);
        }
        return m(".modal", { class: leftOrRight() }, [uiHeaderRoute(chatTitle, "/main"), content]);
    }

    function handleChatUpdate() {
        chatHasUpdate = true;
    }

    function formatChatMessage(message: string): m.Children {
        const isDomainWhitelisted =
            message.startsWith("https://i.imgur.com/") ||
            message.startsWith("https://i.gyazo.com/") ||
            message.startsWith("https://i.ibb.co/") ||
            message.startsWith("https://cdn.discordapp.com/attachments/");
        const isExtensionWhitelisted =
            message.endsWith(".jpg") || message.endsWith(".png") || message.endsWith(".jpeg");

        if (isDomainWhitelisted && isExtensionWhitelisted) {
            return m("img.pointer", {
                src: message,
                onload: () => {
                    if (loadedImages[message]) {
                        return;
                    }
                    requestAnimationFrame(() => {
                        autoScroll = true;
                        handleChatUpdate();
                        m.redraw();
                        loadedImages[message] = true;
                    });
                },
                onclick: NativeSdk.openUrl.bind(null, message),
            });
        }
        return message;
    }

    return {
        onupdate: (vnode) => {
            if ((forceScroll || autoScroll) && chatHasUpdate) {
                chatHasUpdate = false;
                const scrollable = vnode.dom.querySelector(".scrollable") as HTMLElement;
                scrollable?.scrollTo(0, scrollable.scrollHeight);
            }
        },
        oncreate: (vnode) => {
            const scrollable = vnode.dom.querySelector(".scrollable") as HTMLElement;
            scrollable.scrollTo(0, scrollable.scrollHeight);
            scrollable.addEventListener("scroll", (e: Event) => {
                const target = e.target as HTMLElement;
                autoScroll = target.clientHeight + target.scrollTop >= target.scrollHeight;
            });
        },
        oninit: () => {
            G.socket.onChatUpdate.on(handleChatUpdate);
        },
        onremove: () => {
            G.socket.onChatUpdate.off(handleChatUpdate);
        },
        view: (vnode) => {
            const chatInputBox = m(
                ".chat-box-container",
                m(".chat-box", [
                    m("input.text-m", {
                        type: "text",
                        placeholder: t("ChatPlaceholderV2", {
                            length: MAX_CHAT_CHAR,
                        }),
                        oninput: (e) => {
                            if (e.target.value.length <= MAX_CHAT_CHAR) {
                                messageToSend = e.target.value;
                            } else {
                                showToast(t("ChatMessageTooLong"));
                                G.audio.playError();
                            }
                        },
                        onkeydown: (e: KeyboardEvent) => {
                            e.stopPropagation();
                            if (e.key === "Enter") {
                                sendMessage();
                                const s = vnode.dom.querySelector(".scrollable");
                                s.scrollTo(0, s.scrollHeight);
                            }
                        },
                        value: messageToSend,
                    }),
                    m(
                        ".pointer.blue",
                        {
                            style: {
                                margin: "-10px -5px -10px 5px",
                            },
                            onclick: () => {
                                sendMessage();
                            },
                        },
                        iconB("send")
                    ),
                ])
            );
            return withContainer(vnode.attrs.docked, [
                vnode.attrs.docked ? null : chatInputBox,
                m("div.scrollable", [
                    ifTrue(G.socket.isConnected(), () =>
                        m(".chat-messages", [
                            G.socket.chatMessages.map((message) => {
                                return m("div", [
                                    m(".message-name.row", [
                                        m(
                                            ".row.pointer.nobreak",
                                            {
                                                onclick: () => {
                                                    messageToSend = `@${getAlphaNumeric(
                                                        message.user
                                                    )} ${messageToSend}`;
                                                    (
                                                        vnode.dom.querySelector("input[type=text]") as HTMLElement
                                                    ).focus();
                                                },
                                            },
                                            [getChatHead(message), m(".ml5", iconB("reply", 14))]
                                        ),
                                        m(".f1"),
                                        m("div", new Date(message.time).toLocaleTimeString()),
                                        m(
                                            ".ml5.pointer",
                                            {
                                                onclick: () => {
                                                    showAlert(
                                                        t("BlockUserChatTitle", {
                                                            user: message.user,
                                                        }),
                                                        [
                                                            t("BlockUserChatDesc"),
                                                            ifTrue(message.ip, () => [
                                                                m("div.sep10"),
                                                                m(".red", [
                                                                    m(
                                                                        "span.pointer",
                                                                        {
                                                                            onclick: () => muteUserFor(message.ip, 0),
                                                                        },
                                                                        "Unmute,"
                                                                    ),
                                                                    m(
                                                                        "span.pointer.ml5",
                                                                        {
                                                                            onclick: () =>
                                                                                muteUserFor(message.ip, 5 * MINUTE),
                                                                        },
                                                                        "Mute 5min,"
                                                                    ),
                                                                    m(
                                                                        "span.pointer.ml5",
                                                                        {
                                                                            onclick: () =>
                                                                                muteUserFor(message.ip, HOUR),
                                                                        },
                                                                        "Mute 1h,"
                                                                    ),
                                                                    m(
                                                                        "span.pointer.ml5",
                                                                        {
                                                                            onclick: () =>
                                                                                muteUserFor(message.ip, 24 * HOUR),
                                                                        },
                                                                        "Mute 24h,"
                                                                    ),
                                                                    m(
                                                                        "span.pointer.ml5",
                                                                        {
                                                                            onclick: () =>
                                                                                muteUserFor(message.ip, 30 * 24 * HOUR),
                                                                        },
                                                                        "Mute 30d"
                                                                    ),
                                                                ]),
                                                                ifTrue(CC_DEBUG, () => [m(".sep10"), message.ip]),
                                                            ]),
                                                        ],
                                                        [
                                                            {
                                                                class: "red outline",
                                                                name: t("BlockUserChatAction"),
                                                                action: () => {
                                                                    BLOCKED_USERS[message.user] = true;
                                                                    hideAlert();
                                                                },
                                                            },
                                                            {
                                                                class: "blue outline",
                                                                name: t("Cancel"),
                                                            },
                                                        ]
                                                    );
                                                },
                                            },
                                            iconB("report", 14)
                                        ),
                                    ]),
                                    m(
                                        ".message-content",
                                        {
                                            class: mentionsMe(message) ? "me" : null,
                                        },
                                        message.dlc ? formatChatMessage(message.message) : message.message
                                    ),
                                ]);
                            }),
                        ])
                    ),
                    ifTrue(!G.socket.isConnected(), () => m(".mt20", m(".loader"))),
                ]),
                vnode.attrs.docked ? chatInputBox : null,
            ]);
        },
    };
}

export function getChatHead(message: IChatMessage): m.Children {
    // @ts-expect-error Backward Compatible
    if (message.dlc === true) {
        message.dlc = 1;
    }
    return [
        m("div", message.user),
        ifTrue(!!message.flag, () =>
            m("img.chat-badge", {
                title: flagToName(message.flag),
                src: getFlagUrl(message.flag),
            })
        ),
        ifTrue(!!message.dlc, () =>
            m("img.chat-badge", {
                title: t("OwnDLC", { number: message.dlc }),
                src: message.dlc === 2 ? getResourceUrl("images/Exp2.png") : getResourceUrl("images/Exp1.png"),
            })
        ),
        ifTrue(message.mod, () =>
            m("img.chat-badge", {
                title: t("Moderator"),
                src: getResourceUrl("images/Mod.png"),
            })
        ),
    ];
}

async function muteUserFor(ip: string, time: number) {
    try {
        const r = await muteUser(ip, time);
        if (r.status === 200) {
            showToast(t("GeneralServerSuccessMessage"));
        } else {
            G.audio.playError();
            showToast(t("GeneralServerErrorMessage", { error: `${r.status} ${r.statusText}` }));
        }
    } catch (error) {
        G.audio.playError();
        showToast(t("GeneralServerErrorMessage", { error }));
    }
}
