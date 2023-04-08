/* eslint-disable */
import { D } from "./GameData";
import { serverNow } from "./ServerClock";

// prettier-ignore
const NUMBER_SUFFIX_1 = ["", "K", "M", "B", "T", "Qa", "Qt", "Sx", "Sp", "Oc", "Nn", "Dc", "UDc", "DDc", "TDc", "QaDc", "QtDc", "SxDc", "SpDc", "ODc",
    "NDc", "Vi", "UVi", "DVi", "TVi", "QaVi", "QtVi", "SxVi", "SpVi", "OcVi", "NnVi", "Tg", "UTg", "DTg", "TTg", "QaTg", "QtTg", "SxTg", "SpTg", "OcTg",
    "NnTg", "Qd", "UQd", "DQd", "TQd", "QaQd", "QtQd", "SxQd", "SpQd", "OcQd", "NnQd", "Qq", "UQq", "DQq", "TQq", "QaQq", "QtQq", "SxQq", "SpQq", "OcQq",
    "NnQq", "Sg"];

// prettier-ignore
const NUMBER_SUFFIX_BIN = ["", "K", "M", "G", "T", "P", "E", "Z", "Y"];

// prettier-ignore
const NUMBER_SUFFIX_2 = ["", "K", "M", "B", "T", "aa", "bb", "cc", "dd", "ee", "ff", "gg", "hh", "ii", "jj", "kk", "ll", "mm", "nn", "oo", "pp", "qq",
    "rr", "ss", "tt", "uu", "vv", "ww", "xx", "yy", "zz", "Aa", "Bb", "Cc", "Dd", "Ee", "Ff", "Gg", "Hh", "Ii", "Jj", "Kk", "Ll", "Mm", "Nn", "Oo", "Pp",
    "Qq", "Rr", "Ss", "Tt", "Uu", "Vv", "Ww", "Xx", "Yy", "Zz", "AA", "BB", "CC", "DD", "EE", "FF", "GG", "HH", "II", "JJ", "KK", "LL", "MM", "NN", "OO",
    "PP", "QQ", "RR", "SS", "TT", "UU", "VV", "WW", "XX", "YY", "ZZ"];

// prettier-ignore
const NUMBER_SUFFIX_3 = ["", "thousand", "million", "billion", "trillion", "quadrillion", "quintillion", "sextillion", "septillion", "octillion", "nonillion",
    "decillion", "undecillion", "duodecillion", "tredecillion", "quattuordecillion", "quindecillion", "sedecillion", "septendecillion",
    "octodecillion", "novemdecillion ", "vigintillion", "unvigintillion", "duovigintillion", "trevigintillion", "quattuorvigintillion",
    "quinvigintillion", "sexvigintillion", "septenvigintillion", "octovigintillion", "novemvigintillion", "trigintillion", "untrigintillion",
    "duotrigintillion", "tretrigintillion", "quattuortrigintillion", "quintrigintillion", "sextrigintillion", "septentrigintillion",
    "octotrigintillion", "novemtrigintillion", "quadragintillion", "unquadragintillion", "duoquadragintillion", "trequadragintillion",
    "quattuorquadragintillion", "quinquadragintillion", "sexquadragintillion", "septenquadragintillion", "octoquadragintillion",
    "novemquadragintillion", "quinquagintillion", "unquinquagintillion", "duoquinquagintillion", "trequinquagintillion", "quattuorquinquagintillion",
    "quinquinquagintillion", "sexquinquagintillion", "septenquinquagintillion", "octoquinquagintillion", "novemquinquagintillion", "sexagintillion",
    "unsexagintillion", "duosexagintillion", "tresexagintillion", "quattuorsexagintillion", "quinsexagintillion", "sexsexagintillion",
    "septsexagintillion", "octosexagintillion", "octosexagintillion", "septuagintillion", "unseptuagintillion", "duoseptuagintillion",
    "treseptuagintillion", "quinseptuagintillion", "sexseptuagintillion", "septseptuagintillion", "octoseptuagintillion", "novemseptuagintillion",
    "octogintillion", "unoctogintillion", "duooctogintillion", "treoctogintillion", "quattuoroctogintillion", "quinoctogintillion", "sexoctogintillion",
    "septoctogintillion", "octooctogintillion", "novemoctogintillion", "nonagintillion", "unnonagintillion", "duononagintillion", "trenonagintillion",
    "quattuornonagintillion", "quinnonagintillion", "sexnonagintillion", "septnonagintillion", "octononagintillion", "novemnonagintillion", "centillion"];

export const SECOND = 1000;
export const MINUTE = SECOND * 60;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export function nf(num: number, binary = false): string {
    if (!isFinite(num)) {
        return String(num);
    }
    if (D.persisted.useScientificNotation && num >= 1e15) {
        return scientificFormat(num);
    }
    if (binary) {
        return humanFormat(num, NUMBER_SUFFIX_BIN);
    }
    return humanFormat(num, NUMBER_SUFFIX_1);
}

function scientificFormat(num: number): string {
    return num.toExponential(2).replace("00e+", "e").replace("0e+", "e").replace("e+", "e");
}

function humanFormat(num: number, suffix: string[]): string {
    let idx = 0;
    while (Math.abs(num) >= 1000) {
        num /= 1000;
        idx++;
    }
    if (num >= 100) {
        num = Math.floor(num * 10) / 10;
    } else if (num >= 10) {
        num = Math.floor(num * 100) / 100;
    } else {
        num = Math.floor(num * 1000) / 1000;
    }

    if (idx < suffix.length) {
        return num.toLocaleString() + suffix[idx];
    }
    return num.toLocaleString() + "E" + idx;
}

export function formatPercent(p: number) {
    return `${nf(p * 100)}%`;
}

export function formatPercentPrecise(p: number, decimal = 2) {
    return `${(p * 100).round(decimal)}%`;
}

export function getDebugUrlParams(): Record<string, string> {
    if (!CC_DEBUG) {
        return {};
    }
    const query = location.search.substr(1);
    const result = {};
    query.split("&").forEach((part) => {
        const item = part.split("=");
        result[item[0]] = decodeURIComponent(item[1]);
    });
    return result;
}

let counter = 0;

export function getUniqueCounter() {
    return counter++;
}

export function daysFromNow(t: number): string {
    const diff = Math.floor((serverNow() - t) / 1000 / 60 / 60 / 24);
    if (diff <= 0) {
        return "Today";
    } else if (diff === 1) {
        return `Yesterday`;
    } else {
        return `${diff} days ago`;
    }
}

export function numberSign(t: number): "+" | "-" {
    if (t >= 0) {
        return "+";
    }
    return "-";
}

export function getHMS(t: number): [number, number, number] {
    let h = 0;
    let m = 0;
    let s = 0;
    const seconds = Math.floor(t / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (seconds < 60) {
        s = seconds;
    } else if (minutes < 60) {
        s = seconds - minutes * 60;
        m = minutes;
    } else {
        s = seconds - minutes * 60;
        m = minutes - hours * 60;
        h = hours;
    }
    return [h, m, s];
}

export function formatHMS(t: number) {
    if (!isFinite(t)) {
        return "--:--";
    }
    t = cc.misc.clampf(t, 0, Infinity);
    const hms = getHMS(t);
    if (hms[0] === 0) {
        return `${pad(hms[1])}:${pad(hms[2])}`;
    }
    if (hms[0] > 24 * 4) {
        const days = Math.floor(hms[0] / 24);
        if (days > 30) {
            const month = Math.floor(days / 30);
            if (month > 12) {
                const year = Math.floor(month / 12);
                if (year > 10) {
                    return `10y+`;
                }
                return `${year}y${month - 12 * year}mo`;
            }
            return `${month}mo${days - 30 * month}d`;
        }
        return `${days}d${hms[0] - 24 * days}h`;
    }
    return `${pad(hms[0])}:${pad(hms[1])}:${pad(hms[2])}`;
}

export function formatHM(t: number) {
    t = cc.misc.clampf(t, 0, Infinity);
    const hms = getHMS(t);
    if (hms[0] === 0) {
        return `${hms[1]}m`;
    }
    if (hms[1] === 0) {
        return `${hms[0]}h`;
    }
    return `${hms[0]}h${pad(hms[1])}m`;
}

function pad(num: number) {
    return num < 10 ? `0${num}` : num;
}

export function resolveIn<T>(seconds: number, result: T = null): Promise<T> {
    return new Promise((resolve) => {
        setTimeout(() => resolve(result), seconds * 1000);
    });
}

export function rejectIn(seconds: number, reason = "Connection timeout"): Promise<void> {
    return new Promise((resolve, reject) => {
        setTimeout(() => reject(new Error(reason)), seconds * 1000);
    });
}

export function loadScene(scene: string): Promise<void> {
    return new Promise((resolve) => {
        cc.director.loadScene(scene, resolve);
    });
}

export function nearestNode(
    worldPos: cc.Vec3,
    nodes: cc.Node[],
    selector: (node: cc.Node) => boolean = null
): { node: cc.Node; distance: number } {
    let distanceSqr = Infinity;
    let result = null;
    nodes.forEach((node) => {
        if (selector && !selector(node)) {
            return;
        }
        const ds = node.getWorldPosition().sub(worldPos).magSqr();
        if (ds < distanceSqr) {
            result = node;
            distanceSqr = ds;
        }
    });
    return { node: result, distance: Math.sqrt(distanceSqr) };
}

export function trimEnd(str: string) {
    return str.replace(
        /[\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF]*$/,
        ""
    );
}

export function hashCode(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
}

export function ifTrue<T>(condition: boolean, result: () => T): T {
    return condition ? result() : null;
}

export function uuidv4(): string {
    let a, b;
    for (
        // loop :)
        b = a = ""; // b - result , a - numeric variable
        a++ < 36; //
        b +=
            (a * 51) & 52 // if "a" is not 9 or 14 or 19 or 24
                ? //  return a random number or 4
                  (a ^ 15 // if "a" is not 15
                      ? // genetate a random number from 0 to 15
                        8 ^ (Math.random() * (a ^ 20 ? 16 : 4)) // unless "a" is 20, in which case a random number from 8 to 11
                      : 4
                  ) //  otherwise 4
                      .toString(16)
                : "-" //  in other cases (if "a" is 9,14,19,24) insert "-"
    ) {}
    return b;
}

export function findComponent<T extends cc.Component>(type: { prototype: T }, node: cc.Node = null): T {
    if (node) {
        const c = node.getComponent(type);
        if (c) {
            return c;
        }
        return node.getComponentInChildren(type);
    }
    return cc.director.getScene().getComponentInChildren(type);
}

export function findComponents<T extends cc.Component>(type: { prototype: T }, node: cc.Node = null): T[] {
    if (node) {
        const c = node.getComponents(type);
        if (c) {
            return c;
        }
        return node.getComponentsInChildren(type);
    }
    return cc.director.getScene().getComponentsInChildren(type);
}

export function getResourceUrl(path: string) {
    const info = cc.resources.getInfoWithPath(cc.path.mainFileName(path));
    if (info) {
        return cc.assetManager.utils.getUrlWithUuid(info.uuid, {
            isNative: true,
            nativeExt: cc.path.extname(path),
        });
    }
    cc.warn(`getResourceUrl: ${path} does not exist!`);
    return null;
}

export function debounce(func: Function, wait = 100, immediate = false) {
    let timeout, args, context, timestamp, result;
    function later() {
        const last = Date.now() - timestamp;

        if (last < wait && last >= 0) {
            timeout = setTimeout(later, wait - last);
        } else {
            timeout = null;
            if (!immediate) {
                result = func.apply(context, args);
                context = args = null;
            }
        }
    }
    return function (this: any) {
        context = this;
        args = arguments;
        timestamp = Date.now();
        const callNow = immediate && !timeout;
        if (!timeout) timeout = setTimeout(later, wait);
        if (callNow) {
            result = func.apply(context, args);
            context = args = null;
        }

        return result;
    };
}

export function callOnce(func: Function) {
    let called = false;
    return function (this: any) {
        if (called) {
            return;
        }
        const context = this;
        const args = arguments;
        func.apply(context, args);
        called = true;
    };
}

export function truncate(str: string, length: number, start: number = length, replacement = "..."): string {
    if (!str) {
        return "";
    }
    if (str.length > length) {
        const l = Math.min(start, length - replacement.length);
        const e = Math.max(length - start - replacement.length, 0);
        return str.substr(0, l) + replacement + (e > 0 ? str.slice(-e) : "");
    }
    return str;
}

export function normalizeAngle(angle: number, min: number, max: number) {
    while (angle < min) {
        angle += 360;
    }
    while (angle > max) {
        angle -= 360;
    }
    return angle;
}

export function sfc32(a, b, c, d) {
    return function () {
        a |= 0;
        b |= 0;
        c |= 0;
        d |= 0;
        const t = (((a + b) | 0) + d) | 0;
        d = (d + 1) | 0;
        a = b ^ (b >>> 9);
        b = (c + (c << 3)) | 0;
        c = (c << 21) | (c >>> 11);
        c = (c + t) | 0;
        return (t >>> 0) / 4294967296;
    };
}

export function xmur3(str: string) {
    let i: number;
    let h: number;
    for (i = 0, h = 1779033703 ^ str.length; i < str.length; i++)
        (h = Math.imul(h ^ str.charCodeAt(i), 3432918353)), (h = (h << 13) | (h >>> 19));
    return function () {
        (h = Math.imul(h ^ (h >>> 16), 2246822507)), (h = Math.imul(h ^ (h >>> 13), 3266489909));
        return (h ^= h >>> 16) >>> 0;
    };
}

export function srand(s: string): () => number {
    const seed = xmur3(s);
    return sfc32(seed(), seed(), seed(), seed());
}

export function extrapolate(zeroToOne: number, min: number, max: number) {
    return min + (max - min) * zeroToOne;
}

cc.randf = (min, max) => {
    return min + (max - min) * Math.random();
};

export function keysOf<T>(obj: T): (keyof T)[] {
    return Object.keys(obj) as (keyof T)[];
}

export function sizeOf(obj: any): number {
    if (typeof obj !== "object") {
        return 0;
    }
    return Object.keys(obj).length;
}

export function firstKeyOf<K extends string, V>(obj: Partial<Record<K, V>>): K {
    if (typeof obj !== "object") {
        return null;
    }
    const keys = keysOf(obj);
    if (keys.length === 0) {
        return null;
    }
    return keys[0];
}

export function selectOf<K extends string, V>(
    obj: Partial<Record<K, V>>,
    func: (key: K, value: V) => boolean
): Partial<Record<K, V>> {
    const result: Partial<Record<K, V>> = {};
    forEach(obj, (k, v) => {
        if (func(k, v)) {
            result[k] = v;
        }
    });
    return result;
}

export function mapOf<K extends string, V, T>(
    obj: Partial<Record<K, V>>,
    func: (key: K, value: V) => T,
    ifEmpty: () => T[] = () => []
): T[] {
    const result: T[] = [];
    forEach(obj, (k, v) => {
        result.push(func(k, v));
    });
    if (result.length === 0) {
        return ifEmpty();
    }
    return result;
}

export function mapTo<K extends string, V, T>(obj: Partial<Record<K, V>>, func: (key: K, value: V) => T): Record<K, T> {
    const result: Partial<Record<K, T>> = {};
    forEach(obj, (k, v) => {
        result[k] = func(k, v);
    });
    return result as Record<K, T>;
}

export function groupBy<T>(xs: T[], keyGetter: (k: T) => string): Record<string, T[]> {
    return xs.reduce((rv, x) => {
        (rv[keyGetter(x)] = rv[keyGetter(x)] || []).push(x);
        return rv;
    }, {});
}

export const NOOP = () => {};

export function getOrSet<T>(obj: T, key: keyof T, defaultValue: T[keyof T]) {
    if (obj[key] === null || obj[key] === undefined) {
        obj[key] = defaultValue;
    }
    return obj[key];
}

export function safeGet<T>(obj: T, key: keyof T, defaultValue: T[keyof T]) {
    if (obj[key] === null || obj[key] === undefined) {
        return defaultValue;
    }
    return obj[key];
}

export function safeAdd<T extends string | number | symbol>(
    obj: Partial<Record<T, number>>,
    key: T,
    valueToAdd: number,
    min: number = -Infinity,
    max: number = Infinity
): number {
    if (obj[key] === null || obj[key] === undefined) {
        obj[key] = 0;
    }
    obj[key] += valueToAdd;
    obj[key] = cc.misc.clampf(obj[key], min, max);
    return obj[key];
}

export function capitalize(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function randOne<T>(array: readonly T[], randomFunction?: () => number): T {
    randomFunction = randomFunction ?? Math.random;
    return array[cc.misc.clampf(Math.floor(array.length * randomFunction()), 0, array.length - 1)];
}

export function forEach<T>(obj: T, func: (k: keyof T, v: T[keyof T]) => boolean | void) {
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            if (func(key, value) === true) {
                return;
            }
        }
    }
}

export function fetchWithTimeout(timeoutInMs: number, input: RequestInfo, init?: RequestInit): Promise<Response> {
    return Promise.race([
        fetch(input, init),
        new Promise<Response>((_, rej) =>
            setTimeout(() => rej(new Error(`Timeout reaced after ${timeoutInMs}ms`)), timeoutInMs)
        ),
    ]);
}

export function hasValue(obj: any): boolean {
    return obj !== undefined && obj !== null;
}

export function getComparisonSign(a: number, b: number): string {
    if (a > b) {
        return ">";
    }
    if (a < b) {
        return "<";
    }
    return "=";
}

export function assert(cond: boolean, message: string) {
    if (!CC_DEBUG) {
        return;
    }
    if (!cond) {
        cc.warn(message);
        throw new Error(message);
    }
}

export function isPointInView(pos: cc.Vec3, camera: cc.Camera) {
    return (
        Math.abs(camera.node.position.x - pos.x) <= cc.winSize.width / 2 / camera.zoomRatio &&
        Math.abs(camera.node.position.y - pos.y) <= cc.winSize.height / 2 / camera.zoomRatio
    );
}

export function angleTo(origin: cc.Vec3, target: cc.Vec3): number {
    const dir = target.sub(origin);
    const angel = Math.atan2(dir.x, dir.y);
    return (-angel * 180) / Math.PI;
}

export function isRectInView(rect: cc.Rect, camera: cc.Camera) {
    return (
        Math.abs(camera.node.position.x - rect.x - rect.width / 2) <=
            (cc.winSize.width / 2 + rect.width / 2) / camera.zoomRatio &&
        Math.abs(camera.node.position.y - rect.y - rect.width / 2) <=
            (cc.winSize.height / 2 + rect.height / 2) / camera.zoomRatio
    );
}

export function convertFromGameToUI(px: number) {
    const ratio = cc.winSize.height / cc.view.getFrameSize().height;
    return px / ratio;
}

export function convertFromUIToGame(px: number) {
    const ratio = cc.winSize.height / cc.view.getFrameSize().height;
    return px * ratio;
}

export function getMedian(arr: number[]): number {
    const sorted = arr.slice(0).sort((a, b) => a - b);
    const mid = Math.ceil(sorted.length / 2);
    if (sorted.length % 2 === 0) {
        return (sorted[mid] + sorted[mid - 1]) / 2;
    }
    return sorted[mid - 1];
}

export function murmurhash3(key: string, seed: number): number {
    let remainder, bytes, h1, h1b, c1, c1b, c2, c2b, k1, i;

    remainder = key.length & 3; // key.length % 4
    bytes = key.length - remainder;
    h1 = seed;
    c1 = 0xcc9e2d51;
    c2 = 0x1b873593;
    i = 0;

    while (i < bytes) {
        k1 =
            (key.charCodeAt(i) & 0xff) |
            ((key.charCodeAt(++i) & 0xff) << 8) |
            ((key.charCodeAt(++i) & 0xff) << 16) |
            ((key.charCodeAt(++i) & 0xff) << 24);
        ++i;

        k1 = ((k1 & 0xffff) * c1 + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
        k1 = (k1 << 15) | (k1 >>> 17);
        k1 = ((k1 & 0xffff) * c2 + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;

        h1 ^= k1;
        h1 = (h1 << 13) | (h1 >>> 19);
        h1b = ((h1 & 0xffff) * 5 + ((((h1 >>> 16) * 5) & 0xffff) << 16)) & 0xffffffff;
        h1 = (h1b & 0xffff) + 0x6b64 + ((((h1b >>> 16) + 0xe654) & 0xffff) << 16);
    }

    k1 = 0;

    switch (remainder) {
        case 3:
            k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
        case 2:
            k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
        case 1:
            k1 ^= key.charCodeAt(i) & 0xff;

            k1 = ((k1 & 0xffff) * c1 + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
            k1 = (k1 << 15) | (k1 >>> 17);
            k1 = ((k1 & 0xffff) * c2 + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;
            h1 ^= k1;
    }

    h1 ^= key.length;

    h1 ^= h1 >>> 16;
    h1 = ((h1 & 0xffff) * 0x85ebca6b + ((((h1 >>> 16) * 0x85ebca6b) & 0xffff) << 16)) & 0xffffffff;
    h1 ^= h1 >>> 13;
    h1 = ((h1 & 0xffff) * 0xc2b2ae35 + ((((h1 >>> 16) * 0xc2b2ae35) & 0xffff) << 16)) & 0xffffffff;
    h1 ^= h1 >>> 16;

    return h1 >>> 0;
}

let y2 = 0;
let _gaussian_previous = false;

export function clearGaussian() {
    y2 = 0;
    _gaussian_previous = false;
}

export function randomGaussian(mean: number, sd: number, random: () => number): number {
    let y1: number, x1: number, x2: number, w: number;
    if (_gaussian_previous) {
        y1 = y2;
        _gaussian_previous = false;
    } else {
        do {
            x1 = extrapolate(random(), 0, 2) - 1;
            x2 = extrapolate(random(), 0, 2) - 1;
            w = x1 * x1 + x2 * x2;
        } while (w >= 1);
        w = Math.sqrt((-2 * Math.log(w)) / w);
        y1 = x1 * w;
        y2 = x2 * w;
        _gaussian_previous = true;
    }
    const m = mean || 0;
    return y1 * sd + m;
}

export function hasProperty(obj: {}, property: string): boolean {
    return obj[property] !== undefined && obj[property] !== null;
}

export function propertyEqual(
    // eslint-disable-next-line @typescript-eslint/ban-types
    a: Object,
    // eslint-disable-next-line @typescript-eslint/ban-types
    b: Object,
    property: string
): boolean {
    return a[property] === b[property];
}

export function camelCaseToDash(str: string) {
    return str.replace(/([a-zA-Z])(?=[A-Z])/g, "$1-").toLowerCase();
}

export function getAlphaNumeric(str: string) {
    return str.replace(/\W/g, "");
}

export function lastOf<T>(arr: T[]): T {
    return arr[arr.length - 1];
}

export function versionToNumber(version: string) {
    if (typeof version !== "string") {
        return 0;
    }
    return version
        .split(".")
        .reverse()
        .reduce((prev, curr, idx) => {
            return prev + parseInt(curr, 10) * Math.pow(10, 3 * idx);
        }, 0);
}

export function getFlagUrl(flag: string) {
    return `https://iso-flags.netlify.app/${flag.toLowerCase()}.png`;
}

export function maxOf(arr: number[]): number {
    return arr.reduce((a, b) => Math.max(a, b));
}

export function minOf(arr: number[]): number {
    return arr.reduce((a, b) => Math.min(a, b));
}

export function overlap(a: [number, number], b: [number, number]): boolean {
    if (a[0] > a[1] || b[0] > b[1]) {
        cc.error("Overlap range should be [min, max]");
        return false;
    }
    if (b[0] < a[0]) {
        return b[1] > a[0];
    } else {
        return b[0] < a[1];
    }
}

let oldRender: Function;

cc.game.once(cc.game.EVENT_ENGINE_INITED, () => {
    // @ts-expect-error
    oldRender = cc.renderer.render;
});

export function toggleRenderer(on: boolean) {
    if (!oldRender) {
        cc.warn("oldRender is null, you are calling this method before engine is initialized");
        return;
    }
    if (on) {
        // @ts-expect-error
        cc.renderer.render = oldRender;
    } else {
        // @ts-expect-error
        cc.renderer.render = NOOP;
    }
}

export function permute<T>(input: T[]): T[][] {
    let result = [];
    const permute = (arr: T[], m: T[] = []) => {
        if (arr.length === 0) {
            result.push(m);
        } else {
            for (let i = 0; i < arr.length; i++) {
                let curr = arr.slice();
                let next = curr.splice(i, 1);
                permute(curr.slice(), m.concat(next));
            }
        }
    };
    permute(input);
    return result;
}

export function isEmbeddedIFrame() {
    return window !== window.top;
}

export const CountryCode = {
    EARTH: "Earth",
    AD: "Andorra",
    AE: "United Arab Emirates",
    AF: "Afghanistan",
    AG: "Antigua And Barbuda",
    AL: "Albania",
    AM: "Armenia",
    AO: "Angola",
    AR: "Argentina",
    AS: "American Samoa",
    AT: "Austria",
    AU: "Australia",
    AW: "Aruba",
    AX: "Aland Islands",
    AZ: "Azerbaijan",
    BA: "Bosnia And Herzegovina",
    BB: "Barbados",
    BD: "Bangladesh",
    BE: "Belgium",
    BF: "Burkina Faso",
    BG: "Bulgaria",
    BH: "Bahrain",
    BI: "Burundi",
    BJ: "Benin",
    BM: "Bermuda",
    BN: "Brunei Darussalam",
    BO: "Bolivia",
    BR: "Brazil",
    BS: "Bahamas",
    BT: "Bhutan",
    BW: "Botswana",
    BY: "Belarus",
    BZ: "Belize",
    CA: "Canada",
    CD: "Congo, Democratic Republic",
    CF: "Central African Republic",
    CG: "Congo",
    CH: "Switzerland",
    CI: 'Cote D"Ivoire',
    CL: "Chile",
    CM: "Cameroon",
    CN: "China",
    CO: "Colombia",
    CR: "Costa Rica",
    CU: "Cuba",
    CV: "Cape Verde",
    CY: "Cyprus",
    CZ: "Czech Republic",
    DE: "Germany",
    DJ: "Djibouti",
    DK: "Denmark",
    DM: "Dominica",
    DO: "Dominican Republic",
    DZ: "Algeria",
    EC: "Ecuador",
    EE: "Estonia",
    EG: "Egypt",
    EH: "Western Sahara",
    ER: "Eritrea",
    ES: "Spain",
    ET: "Ethiopia",
    FI: "Finland",
    FJ: "Fiji",
    FM: "Micronesia, Federated States Of",
    FO: "Faroe Islands",
    FR: "France",
    GA: "Gabon",
    GB: "United Kingdom",
    GD: "Grenada",
    GE: "Georgia",
    GH: "Ghana",
    GI: "Gibraltar",
    GL: "Greenland",
    GM: "Gambia",
    GN: "Guinea",
    GQ: "Equatorial Guinea",
    GR: "Greece",
    GT: "Guatemala",
    GW: "Guinea-Bissau",
    GY: "Guyana",
    HK: "Hong Kong",
    HN: "Honduras",
    HR: "Croatia",
    HT: "Haiti",
    HU: "Hungary",
    ID: "Indonesia",
    IE: "Ireland",
    IL: "Israel",
    IN: "India",
    IO: "British Indian Ocean Territory",
    IQ: "Iraq",
    IR: "Iran, Islamic Republic Of",
    IS: "Iceland",
    IT: "Italy",
    JM: "Jamaica",
    JO: "Jordan",
    JP: "Japan",
    KE: "Kenya",
    KG: "Kyrgyzstan",
    KH: "Cambodia",
    KI: "Kiribati",
    KM: "Comoros",
    KN: "Saint Kitts And Nevis",
    KP: "North Korea",
    KR: "Korea",
    KW: "Kuwait",
    KY: "Cayman Islands",
    KZ: "Kazakhstan",
    LA: 'Lao People"s Democratic Republic',
    LB: "Lebanon",
    LC: "Saint Lucia",
    LI: "Liechtenstein",
    LK: "Sri Lanka",
    LR: "Liberia",
    LS: "Lesotho",
    LT: "Lithuania",
    LU: "Luxembourg",
    LV: "Latvia",
    LY: "Libyan Arab Jamahiriya",
    MA: "Morocco",
    MC: "Monaco",
    MD: "Moldova",
    ME: "Montenegro",
    MG: "Madagascar",
    MH: "Marshall Islands",
    MK: "Macedonia",
    ML: "Mali",
    MM: "Myanmar",
    MN: "Mongolia",
    MO: "Macao",
    MR: "Mauritania",
    MT: "Malta",
    MU: "Mauritius",
    MV: "Maldives",
    MW: "Malawi",
    MX: "Mexico",
    MY: "Malaysia",
    MZ: "Mozambique",
    NA: "Namibia",
    NE: "Niger",
    NG: "Nigeria",
    NI: "Nicaragua",
    NL: "Netherlands",
    NO: "Norway",
    NP: "Nepal",
    NR: "Nauru",
    NZ: "New Zealand",
    OM: "Oman",
    PA: "Panama",
    PE: "Peru",
    PF: "French Polynesia",
    PG: "Papua New Guinea",
    PH: "Philippines",
    PK: "Pakistan",
    PL: "Poland",
    PR: "Puerto Rico",
    PS: "Palestinian Territory, Occupied",
    PT: "Portugal",
    PW: "Palau",
    PY: "Paraguay",
    QA: "Qatar",
    RO: "Romania",
    RS: "Serbia",
    RU: "Russian Federation",
    RW: "Rwanda",
    SA: "Saudi Arabia",
    SB: "Solomon Islands",
    SC: "Seychelles",
    SD: "Sudan",
    SE: "Sweden",
    SG: "Singapore",
    SI: "Slovenia",
    SK: "Slovakia",
    SL: "Sierra Leone",
    SM: "San Marino",
    SN: "Senegal",
    SO: "Somalia",
    SR: "Suriname",
    ST: "Sao Tome And Principe",
    SV: "El Salvador",
    SY: "Syrian Arab Republic",
    SZ: "Swaziland",
    TD: "Chad",
    TG: "Togo",
    TH: "Thailand",
    TJ: "Tajikistan",
    TL: "Timor-Leste",
    TM: "Turkmenistan",
    TN: "Tunisia",
    TO: "Tonga",
    TR: "Turkey",
    TT: "Trinidad And Tobago",
    TV: "Tuvalu",
    TW: "Taiwan",
    TZ: "Tanzania",
    UA: "Ukraine",
    UG: "Uganda",
    US: "United States",
    UY: "Uruguay",
    UZ: "Uzbekistan",
    VA: "Holy See (Vatican City State)",
    VC: "Saint Vincent And Grenadines",
    VE: "Venezuela",
    VN: "Vietnam",
    VU: "Vanuatu",
    WS: "Samoa",
    YE: "Yemen",
    ZA: "South Africa",
    ZM: "Zambia",
    ZW: "Zimbabwe",
};
