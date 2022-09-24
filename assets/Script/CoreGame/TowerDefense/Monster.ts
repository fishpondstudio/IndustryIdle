import { G } from "../../General/GameData";
import { Pathway } from "../../Shared/CommonDataTypes";
import { getCurrentColor } from "../ColorThemes";
import { gridToPosition } from "../GridHelper";

const { ccclass, property } = cc._decorator;

@ccclass
export default class Monster extends cc.Component {
    public static EVENT_DIE = "MonsterDie";
    public static EVENT_ENTER_HQ = "MonsterEnterHQ";

    @property([cc.SpriteFrame]) protected spriteFrames: cc.SpriteFrame[] = [];
    @property(cc.Sprite) protected sprite: cc.Sprite = null;
    @property(cc.Node) protected hpNode: cc.Node = null;
    @property(cc.Node) protected hpFillNode: cc.Node = null;

    private _pathway: Pathway;
    private _pathIndex = 0;
    private _fullHpWidth = 0;
    private _fullHp = 0;
    private _hp = 0;

    public expectedHp = 0;
    private _speed: number;

    public get hp(): number {
        return this._hp;
    }
    public set hp(value: number) {
        this._hp = cc.misc.clampf(value, 0, this._fullHp);
        if (this._hp <= 0) {
            G.world.waveManager.successCount++;
            this.node.emit(Monster.EVENT_DIE);
            this.returnToPool();
            return;
        }
        const pct = this._hp / this._fullHp;
        if (pct >= 0.6) {
            this.hpFillNode.color = getCurrentColor().green;
        } else if (pct >= 0.25) {
            this.hpFillNode.color = getCurrentColor().orange;
        } else {
            this.hpFillNode.color = getCurrentColor().red;
        }
        this.hpFillNode.width = pct * this._fullHpWidth;
    }

    protected override onLoad(): void {
        this._fullHpWidth = this.hpFillNode.width;
    }

    public init(pathway: Pathway, hp: number, speed: number): void {
        cc.assert(pathway.length > 0, "Pathway should not be empty!");
        this._fullHp = hp;
        this.expectedHp = hp;
        this.hp = hp;
        this._pathway = pathway;
        this._pathIndex = 0;
        this._speed = speed;
        // Visual
        this.sprite.node.opacity = 0;
        this.sprite.spriteFrame = this.spriteFrames.randOne();
        this.sprite.node.angle = cc.randf(0, 360);
        this.hpNode.opacity = 0;
        cc.tween(this.sprite.node).to(0.5, { opacity: 100 }).start();
        cc.tween(this.hpNode).to(0.5, { opacity: 255 }).start();
    }

    public tick(dt: number): void {
        if (this._pathIndex >= this._pathway.length) {
            this.node.emit(Monster.EVENT_ENTER_HQ);
            G.world.waveManager.failCount++;
            this.returnToPool();
            return;
        }
        this.sprite.node.angle += 45 * dt;
        const target = gridToPosition(cc.v3(this._pathway[this._pathIndex][0], this._pathway[this._pathIndex][1]));
        const diff = target.sub(this.node.position);
        const dist = diff.mag();
        const dir = diff.normalize();
        const targetDist = this._speed * dt;
        if (dist >= targetDist) {
            this.node.position = this.node.position.add(dir.mul(targetDist));
        } else {
            this.node.position = target;
            ++this._pathIndex;
        }
    }

    public target(): string {
        // Last one is HQ, we can ignore that as well
        if (this._pathIndex >= this._pathway.length - 1) {
            return null;
        }
        return `${this._pathway[this._pathIndex][0]},${this._pathway[this._pathIndex][1]}`;
    }

    private returnToPool() {
        this.node.off(Monster.EVENT_DIE);
        this.node.off(Monster.EVENT_ENTER_HQ);
        G.world.monstersPool.put(this);
    }
}
