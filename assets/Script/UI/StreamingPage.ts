import { API_HOST, D, G } from "../General/GameData";
import { getFlagUrl, getResourceUrl, hasValue, ifTrue, mapOf, sizeOf } from "../General/Helper";
import { t } from "../General/i18n";
import { isAndroid, isIOS } from "../General/NativeSdk";
import { getStreamingUser, sendOffer, sendSignal, watchStreamer } from "../General/WebRTC";
import { flagToName } from "./ChooseFlagPage";
import { iconB, uiBoxToggle } from "./UIHelper";
import { hideAlert, showAlert, showToast } from "./UISystem";

export interface IStreamingUser {
    name: string;
    dlc: number;
    flag: string;
}

export interface IAudience {
    user: IStreamingUser;
    connection?: RTCPeerConnection;
}

export interface IStreamer extends IAudience {
    key?: string;
}

interface IStreamingConfig {
    on: boolean;
    public: boolean;
    token: string;
    users: Record<string, IStreamingUser>;
    watching: IStreamer;
    showVideo: boolean;
    broadcastTo: Record<string, IAudience>;
    stream: MediaStream;
    canRecord: boolean;
}

export const Streaming: IStreamingConfig = {
    on: false,
    public: false,
    token: null,
    users: {},
    watching: null,
    showVideo: false,
    broadcastTo: {},
    stream: null,
    canRecord: hasValue(window.showSaveFilePicker),
};

let mediaRecorder: MediaRecorder;

export function StreamingPage(): m.Comp {
    return {
        view: (vnode) => {
            if (isIOS() || isAndroid()) {
                return null;
            }
            const audienceCount = sizeOf(Streaming.broadcastTo);
            return m(".box", [
                m(".title", t("StreamingSettings")),
                ifTrue(Streaming.canRecord, () => [
                    m(".hr"),
                    ifTrue(!isRecording(), () => [
                        m(".two-col.pointer", { onclick: startRecord }, [
                            m(".blue", t("StreamingStartRecord")),
                            m(".red", iconB("radio_button_checked")),
                        ]),
                        m(".hr"),
                        m(".two-col.pointer", { onclick: startCameraSequence }, [
                            m("div", [
                                m("div", t("StreamingRecordCamera")),
                                m(".text-desc.text-s", t("StreamingRecordCameraDesc")),
                            ]),
                            m(".blue.ml20", iconB("movie")),
                        ]),
                    ]),
                    ifTrue(isRecording(), () =>
                        m(
                            ".two-col.pointer",
                            {
                                onclick: async () => {
                                    saveAs(await stopRecord());
                                },
                            },
                            [m(".blue", t("StreamingStopRecord")), m(".red", iconB("stop_circle"))]
                        )
                    ),
                ]),
                m(".hr"),
                uiBoxToggle(
                    t("StreamingMakeMeDiscoverable"),
                    t("StreamingMakeMeDiscoverableDesc"),
                    Streaming.on,
                    async () => {
                        try {
                            Streaming.on = !Streaming.on;
                            if (Streaming.on) {
                                if (!Streaming.stream) {
                                    Streaming.stream = cc.game.canvas.captureStream(30);
                                }
                            }
                            const r = await fetch(`${API_HOST}/stream?status=${Streaming.on ? "on" : "off"}`, {
                                method: "post",
                                headers: { "X-User-Id": D.persisted.userId },
                            });
                            if (r.status !== 200) {
                                throw new Error(r.statusText);
                            }
                            const json = await r.json();
                            Streaming.on = !!json.streaming;
                            if (json.token) {
                                Streaming.token = json.token;
                            }
                        } catch (error) {
                            showToast(t("GeneralServerErrorMessage", { error: error?.message }));
                        }
                    }
                ),
                ifTrue(Streaming.on, () => {
                    return [
                        m(".hr"),
                        uiBoxToggle(t("StreamAutoApprove"), t("StreamAutoApproveDesc"), Streaming.public, () => {
                            Streaming.public = !Streaming.public;
                        }),
                    ];
                }),
                ifTrue(audienceCount > 0, () => [
                    m(".hr"),
                    m(".title.two-col", [m("div", t("StreamingAudience")), m("div", audienceCount)]),
                ]),
                mapOf(Streaming.broadcastTo, (key, audience) => {
                    const user = audience.user;
                    let action: m.Children = null;
                    if (hasValue(audience.connection)) {
                        action = m(
                            ".pointer.red",
                            {
                                title: t("StreamingStopStreamDesc"),
                                onclick: () => {
                                    delete Streaming.broadcastTo[key];
                                    audience.connection.close();
                                },
                            },
                            t("StreamingStop")
                        );
                    } else {
                        action = [
                            m(
                                ".pointer.blue",
                                {
                                    onclick: async () => {
                                        audience.connection = await sendOffer(key);
                                    },
                                },
                                t("StreamingAcceptStream")
                            ),
                            m(
                                ".pointer.blue.ml10",
                                {
                                    onclick: () => {
                                        delete Streaming.broadcastTo[key];
                                        audience.connection?.close();
                                        sendSignal(key, { reject: true, user: getStreamingUser() });
                                    },
                                },
                                t("StreamingRejectStream")
                            ),
                        ];
                    }
                    return [
                        m(".hr"),
                        m(".row.text-m.uppercase", [
                            m("div", user.name),
                            ifTrue(!!user.flag, () =>
                                m("img.chat-badge", {
                                    title: flagToName(user.flag),
                                    src: getFlagUrl(user.flag),
                                })
                            ),
                            ifTrue(user.dlc > 0, () =>
                                m("img.chat-badge", {
                                    title: t("OwnDLC", { number: user.dlc }),
                                    src: getResourceUrl(`images/Exp${user.dlc}.png`),
                                })
                            ),
                            m(".f1"),
                            action,
                        ]),
                    ];
                }),
                ifTrue(sizeOf(Streaming.users) > 0, () => [m(".hr"), m(".title", t("StreamingAvailableStreams"))]),
                mapOf(Streaming.users, (token, user) => {
                    return [
                        m(".hr"),
                        m(".row.text-m.uppercase", [
                            m("div", user.name),
                            ifTrue(!!user.flag, () =>
                                m("img.chat-badge", {
                                    title: flagToName(user.flag),
                                    src: getFlagUrl(user.flag),
                                })
                            ),
                            ifTrue(user.dlc > 0, () =>
                                m("img.chat-badge", {
                                    title: t("OwnDLC", { number: user.dlc }),
                                    src: getResourceUrl(`images/Exp${user.dlc}.png`),
                                })
                            ),
                            m(".f1"),
                            getStreamerAction(token, user),
                        ]),
                    ];
                }),
            ]);
        },
    };
}

function getStreamerAction(token: string, user: IStreamingUser): m.Children {
    if (Streaming.token === token) {
        return null;
    }
    if (hasValue(Streaming.watching?.connection) && user === Streaming.watching.user) {
        // Connection Established!
        return m(
            ".red.pointer",
            {
                onclick: () => {
                    Streaming.watching.connection.close();
                    Streaming.showVideo = false;
                    Streaming.watching = null;
                    if (document.pictureInPictureElement) {
                        document.exitPictureInPicture();
                    }
                },
            },
            t("StreamingStop")
        );
    }
    if (hasValue(Streaming.watching) && user === Streaming.watching.user) {
        // Waiting for Offer!
        return m(
            ".pointer.red",
            {
                onclick: () => {
                    if (Streaming.watching?.key) {
                        G.socket.send({
                            type: "signal",
                            cancelInit: true,
                            key: Streaming.watching?.key,
                        });
                    }
                    Streaming.watching = null;
                },
            },
            t("Cancel")
        );
    }
    if (!hasValue(Streaming.watching)) {
        return m(
            ".pointer.blue",
            {
                onclick: () => {
                    watchStreamer(token, user);
                },
            },
            t("StreamingWatch")
        );
    }
    return null;
}

function isRecording(): boolean {
    return mediaRecorder?.state === "recording";
}

function startRecord() {
    if (!Streaming.stream) {
        Streaming.stream = cc.game.canvas.captureStream(30);
    }
    const option: MediaRecorderOptions = {
        videoBitsPerSecond: 48_000_000,
    };
    if (CC_DEBUG) {
        option.videoBitsPerSecond = 24_000_000;
        option.mimeType = "video/webm;codecs=vp9";
    }
    mediaRecorder = new MediaRecorder(Streaming.stream, option);
    mediaRecorder.start();
}

async function startCameraSequence() {
    G.world.playerInput.playZoomAnim(7, 1, 2, startRecord, async () => {
        const data = await stopRecord();
        showAlert(t("StreamingRecordingReady"), t("StreamingRecordingReadyDesc"), [
            {
                name: t("Cancel"),
                class: "outline blue",
            },
            {
                name: t("StreamingRecordingSave"),
                class: "outline blue",
                action: () => {
                    saveAs(data);
                    hideAlert();
                },
            },
        ]);
    });
}

function stopRecord(): Promise<Blob> {
    return new Promise((resolve, reject) => {
        if (mediaRecorder) {
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    resolve(event.data);
                }
                mediaRecorder.ondataavailable = null;
                mediaRecorder = null;
            };
            mediaRecorder.stop();
        } else {
            reject();
        }
    });
}

async function saveAs(data: Blob) {
    const blob = new Blob([data], {
        type: "video/webm",
    });
    const suggestedName = `Industry-Idle-${D.persisted.userName}-${Math.floor(Date.now() / 1000)}`;
    const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{ accept: { "video/webm": [".webm"] } }],
    });
    const stream = await handle.createWritable();
    await stream.write(blob);
    await stream.close();
}
