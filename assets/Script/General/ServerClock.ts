let offset = 0;
let fakeOffset = 0;
let success = false;

export function setServerClock(time: number) {
    const n = clientNow();
    const newOffset = time - n;
    if (Math.abs(newOffset - offset) > 1000) {
        offset = newOffset;
        cc.log(`Server Time = ${time}, Client Time = ${n}, Offset = ${offset}`);
    }
    success = true;
}

export function timeSynced() {
    return success;
}

export function serverNow() {
    return clientNow() + offset;
}

export function convertToServerTime(clientTime: number) {
    return clientTime + offset;
}

function clientNow() {
    return Date.now() + fakeOffset;
}

export function changeClock(delta: number) {
    fakeOffset += delta;
}
