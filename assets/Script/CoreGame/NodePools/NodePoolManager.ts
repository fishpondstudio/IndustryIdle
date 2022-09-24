const { ccclass, property } = cc._decorator;

@ccclass
export default class NodePoolManager<K extends cc.Component> extends cc.Component {
    @property protected cleanupTimer = 30;

    private nodePool: K[] = [];

    public init(size: number): void {
        for (let i = 0; i < size; i++) {
            const c = this.make();
            c.node.active = false;
            this.nodePool.push(c);
        }
        this.schedule(this.cleanup, this.cleanupTimer, cc.macro.REPEAT_FOREVER, 0);
    }

    public get(): K {
        let bm: K;
        if (this.nodePool.length > 0) {
            bm = this.nodePool.pop();
        } else {
            bm = this._make();
        }
        if (!bm.node.parent) {
            bm.node.parent = this.node;
        }
        bm.node.active = true;
        return bm;
    }

    public put(c: K): void {
        c.node.active = false;
        c.node.attr({ t: Date.now() });
        this.nodePool.push(c);
    }

    protected putAll(component: { new (): K }): void {
        this.node.children.forEach((node) => {
            if (node.active) {
                this.put(node.getComponent(component));
            }
        });
    }

    private _make(): K {
        const c = this.make();
        c.node.attr({ t: Date.now() });
        return c;
    }

    protected make(): K {
        throw new Error("Not Implemented!");
    }

    protected cleanup(): void {
        const now = Date.now();
        this.nodePool = this.nodePool.filter((c) => {
            const t = c.node.getAttr<number>("t");
            if (now - t <= this.cleanupTimer * 1000) {
                return true;
            }
            c.node.destroy();
            return false;
        });
    }
}
