// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace cc {
    interface Node {
        angleTo(worldPoint: cc.Vec3): number;
        getWorldPosition(): cc.Vec3;
        relativeFrom(node: cc.Node): cc.Vec3;
        setWorldPosition(worldPosition: cc.Vec3): void;
        follow(node: cc.Node): void;
        getAttr<T>(key: string): T;
    }
    interface Graphics {
        dashedLine(startPos: cc.Vec3, endPos: cc.Vec3, lineLength?: number, spaceLength?: number): void;
    }
    interface Vec2 {
        clampDistance(min: number, max: number): Vec2;
    }
    export function normalizeAngle(angle: number): number;
    export function assert(cond: boolean, msg?: string): void;
    export function hasScene(sceneName: string): boolean;
    export function randi(minInclusive: number, maxInclusive: number): number;
    export function randf(minInclusive: number, maxInclusive: number): number;
    export function takeScreenshot(size?: number, xOffset?: number, yOffset?: number): Promise<string>;
    export function spriteFrameFromBase64(base64: string): Promise<SpriteFrame>;
    export function urlIs(url: string): boolean;
    export function vibrate(pattern: number | number[]): boolean;
}

interface Array<T> {
    randOne(randomFunction?: () => number): T;
    shuffle<T>(this: T[], rand?: () => number): T[];
    uniq(): T[];
}

interface Number {
    // tslint:disable-line
    round(decimal: number): number;
}

Number.prototype.round = function round(this: number, decimal: number): number {
    const fac = Math.pow(10, decimal);
    return Math.round(this * fac) / fac;
};

Array.prototype.randOne = function randOne<T>(this: T[], randomFunction?: () => number): T {
    randomFunction = randomFunction ?? Math.random;
    return this[Math.floor(this.length * randomFunction())];
};

Array.prototype.shuffle = function shuffle<T>(this: T[], rand?: () => number): T[] {
    rand = rand ?? Math.random;
    for (let i = this.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [this[i], this[j]] = [this[j], this[i]];
    }
    return this;
};

Array.prototype.uniq = function uniq<T>(this: T[]): T[] {
    return this.filter((v, i, a) => a.indexOf(v) === i);
};

cc.Node.prototype.getWorldPosition = function getWorldPosition(this: cc.Node) {
    return this.parent.convertToWorldSpaceAR(this.position);
};

cc.Node.prototype.setWorldPosition = function setWorldPosition(this: cc.Node, worldPosition: cc.Vec3) {
    this.position = this.parent.convertToNodeSpaceAR(worldPosition);
};

cc.Node.prototype.relativeFrom = function relativeFrom(this: cc.Node, target: cc.Node) {
    return this.parent.convertToNodeSpaceAR(target.getWorldPosition());
};

cc.Node.prototype.follow = function follow(this: cc.Node, target: cc.Node) {
    this.position = this.relativeFrom(target);
};

cc.Node.prototype.angleTo = function angleTo(this: cc.Node, worldPoint: cc.Vec3): number {
    const target = worldPoint.sub(this.getWorldPosition());
    const angel = Math.atan2(target.x, target.y);
    return (-angel * 180) / Math.PI;
};

cc.Node.prototype.getAttr = function getAttr<T>(this: cc.Node, key: string): T {
    return this[key] as T;
};

cc.Vec2.prototype.clampDistance = function clampDistance(this: cc.Vec2, min: number, max: number) {
    const length = this.mag();
    if (length < min) {
        return this.normalize().mul(min);
    }
    if (length > max) {
        return this.normalize().mul(max);
    }
    return this;
};

cc.spriteFrameFromBase64 = (base64) => {
    return new Promise<cc.SpriteFrame>((resolve) => {
        const img = new Image();
        img.src = base64;
        img.onload = () => {
            const texture = new cc.Texture2D();
            texture.initWithElement(img);
            texture.handleLoadedTexture();
            const newframe = new cc.SpriteFrame(texture);
            resolve(newframe);
        };
    });
};

cc.takeScreenshot = (size = 0, xOffset = 0, yOffset = 0) => {
    return new Promise<string>((resolve) => {
        cc.director.on(cc.Director.EVENT_AFTER_DRAW, () => {
            let dataUrl: string;
            if (size > 0) {
                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d");
                canvas.width = size;
                canvas.height = size;
                const ss = Math.min(cc.game.canvas.width, cc.game.canvas.height);
                const sx = (cc.game.canvas.width - ss) / 2 + xOffset;
                const sy = (cc.game.canvas.height - ss) / 2 + yOffset;
                context.drawImage(cc.game.canvas, sx, sy, ss, ss, 0, 0, size, size);
                dataUrl = canvas.toDataURL();
            } else {
                dataUrl = cc.game.canvas.toDataURL();
            }
            cc.director.off(cc.Director.EVENT_AFTER_DRAW);
            resolve(dataUrl);
        });
    });
};

cc.normalizeAngle = (angle) => {
    while (angle < -180) {
        angle += 360;
    }
    while (angle > 180) {
        angle -= 360;
    }
    return angle;
};

cc.randi = (min, max) => {
    return Math.round(cc.randf(min, max));
};

cc.randf = (min, max) => {
    return min + (max - min) * Math.random();
};

cc.urlIs = (url) => {
    return window.location.hash === "!" + url;
};

cc.hasScene = (name) => {
    const scenes = cc.game.config.scenes;
    for (const s of scenes) {
        if (s.url.endsWith(name + ".fire")) {
            return true;
        }
    }
    return false;
};

cc.vibrate = (pattern) => {
    if (navigator.vibrate) {
        return navigator.vibrate(pattern);
    }
    return false;
};

if (cc.Graphics) {
    cc.Graphics.prototype.dashedLine = function (
        this: cc.Graphics,
        startPos,
        endPos,
        lineLength = 10,
        spaceLength = 20
    ) {
        let cursor = startPos;
        let count = 0;
        const direction = endPos.sub(startPos);
        if (direction.mag() < 10) {
            return;
        }
        const increment = direction.normalize();
        while ((endPos.x - cursor.x) * increment.x >= 0 && (endPos.y - cursor.y) * increment.y >= 0) {
            if (count % 2 === 0) {
                this.moveTo(cursor.x, cursor.y);
                cursor = cursor.add(increment.mul(lineLength));
            } else {
                this.lineTo(cursor.x, cursor.y);
                cursor = cursor.add(increment.mul(spaceLength));
            }
            count++;
        }
    };
}
