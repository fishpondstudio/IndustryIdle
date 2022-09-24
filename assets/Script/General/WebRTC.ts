import { IStreamingUser, Streaming } from "../UI/StreamingPage";
import { showToast } from "../UI/UISystem";
import { D, G } from "./GameData";
import { sizeOf } from "./Helper";
import { t } from "./i18n";

export function initWebRTC() {
    G.socket.onSignalMessage.on(async (message) => {
        if (!message.key) {
            cc.warn("Message does not have a key:", message);
            return;
        }
        // Received by Streamer
        if (message.init) {
            Streaming.broadcastTo[message.key] = { user: message.user };
            if (Streaming.public) {
                Streaming.broadcastTo[message.key].connection = await sendOffer(message.key);
            } else {
                G.audio.playEffect(G.audio.bubble);
                showToast(t("StreamingPlayerRequested", { player: message.user?.name }));
            }
            return;
        }
        // Received by Streamer
        if (message.cancelInit) {
            Streaming.broadcastTo[message.key]?.connection?.close();
            delete Streaming.broadcastTo[message.key];
            return;
        }
        // Received by Streamer
        if (message.answer) {
            const pc = Streaming.broadcastTo[message.key];
            if (pc && pc.connection) {
                await pc.connection.setRemoteDescription(new RTCSessionDescription(message.answer));
            }
            return;
        }

        // Received Audience
        if (message.issueKey) {
            if (Streaming.watching) {
                Streaming.watching.key = message.key;
            } else {
                cc.log("Outdated `issueKey`, ignore");
            }
            return;
        }
        // Received Audience
        if (message.reject) {
            if (Streaming.watching?.key === message.key) {
                Streaming.watching?.connection?.close();
                Streaming.showVideo = false;
                Streaming.watching = null;
                G.audio.playError();
                showToast(
                    t("StreamingPlayerRejected", {
                        player: message?.user?.name,
                    })
                );
            } else {
                cc.log("Outdated `issueKey`, ignore");
            }
            return;
        }
        if (message.offer) {
            if (!Streaming.watching) {
                cc.log("Outdated `offer`, ignore");
                return;
            }
            if (Streaming.watching?.key !== message.key) {
                cc.log(
                    `Key mismatch, ignore this offer! Expected = ${Streaming.watching.key} Received = ${message.key}`
                );
                return;
            }
            const pc = createAudienceConnection(message.key, message.offer);
            Streaming.watching.connection = pc;
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendSignal(message.key, { answer });
            return;
        }

        // Received by both, identified by "from" field
        if (message.candidate) {
            try {
                if (message.from === "streamer") {
                    await Streaming.watching.connection.addIceCandidate(message.candidate);
                }
                if (message.from === "audience") {
                    await Streaming.broadcastTo[message.key].connection.addIceCandidate(message.candidate);
                }
            } catch (e) {
                console.error("Error adding received ice candidate", e);
            }
        }
    });
}

export async function sendOffer(key: string): Promise<RTCPeerConnection> {
    const pc = createStreamerConnection(key);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sendSignal(key, {
        offer,
        user: getStreamingUser(),
    });
    return pc;
}

function createStreamerConnection(key: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun.vivox.com:3478" }],
    });

    if (!Streaming.stream) {
        Streaming.stream = cc.game.canvas.captureStream(30);
    }
    Streaming.stream.getTracks().forEach((track) => {
        pc.addTrack(track, Streaming.stream);
    });

    // Data channel
    const dataChannel = pc.createDataChannel("game");
    dataChannel.onopen = () => {
        dataChannel.send("Hi from streamer");
    };
    dataChannel.onmessage = (message) => {};

    // Events
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            sendSignal(key, {
                from: "streamer",
                candidate: event.candidate,
            });
        }
    };
    pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
            sendSignal(key, {
                connected: true,
            });
        }
        if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
            const audience = Streaming.broadcastTo[key];
            if (audience?.connection === pc) {
                pc.close();
                delete Streaming.broadcastTo[key];
            }
            if (pc.connectionState === "failed") {
                sendSignal(key, {
                    failed: true,
                });
            }
        }
    };
    pc.ondatachannel = (event) => {
        const dataChannel = event.channel;
        dataChannel.onopen = () => {
            dataChannel.send("Hi from audience");
        };
        dataChannel.onmessage = (message) => {};
    };
    return pc;
}

function createAudienceConnection(key: string, offer: RTCSessionDescriptionInit): RTCPeerConnection {
    const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun.vivox.com:3478" }],
    });
    pc.ondatachannel = (event) => {
        const dataChannel = event.channel;
        dataChannel.onopen = () => {
            dataChannel.send("Hi from audience");
        };
        dataChannel.onmessage = (message) => {};
    };
    pc.ontrack = (e) => {
        const video = document.getElementById("video-stream") as HTMLVideoElement;
        if (video.srcObject !== e.streams[0]) {
            video.srcObject = e.streams[0];
        }
        video.onloadedmetadata = () => {
            video.requestPictureInPicture();
        };
    };
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            sendSignal(key, {
                from: "audience",
                candidate: event.candidate,
            });
        }
    };
    pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
            Streaming.showVideo = true;
            m.redraw();
            sendSignal(key, {
                connected: true,
            });
        }
        if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
            if (Streaming.watching?.connection === pc) {
                pc.close();
                G.audio.playError();
                showToast(
                    pc.connectionState === "disconnected"
                        ? t("StreamingPlayerDisconnected", {
                              player: Streaming.watching.user.name,
                          })
                        : t("StreamingConnectionFailed")
                );
                Streaming.showVideo = false;
                Streaming.watching = null;
                if (document.pictureInPictureElement) {
                    document.exitPictureInPicture();
                }
            }
            if (pc.connectionState === "failed") {
                sendSignal(key, {
                    failed: true,
                });
            }
        }
    };
    pc.setRemoteDescription(offer);
    return pc;
}

export function sendSignal(key: string, payload: Record<string, any>) {
    G.socket.send({ ...payload, type: "signal", key });
}

export function watchStreamer(token: string, user: IStreamingUser) {
    Streaming.watching = { user };
    G.socket.send({
        type: "signal",
        init: true,
        token,
        user: getStreamingUser(),
    });
}

export function getStreamingUser(): IStreamingUser {
    return {
        name: D.persisted.userName,
        flag: D.persisted.flag,
        dlc: sizeOf(D.persisted.dlc),
    };
}
