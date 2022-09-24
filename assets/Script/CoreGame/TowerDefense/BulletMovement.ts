import { G } from "../../General/GameData";
import { angleTo } from "../../General/Helper";
import Monster from "./Monster";

const { ccclass, property } = cc._decorator;

@ccclass
export default class BulletMovement extends cc.Component {
    private _target: cc.Node;
    private _damage: number;
    private _speed: number;

    public init(target: cc.Node, damage: number, speed: number) {
        this._target = target;
        this._damage = damage;
        this._speed = speed;
        this._target.on(Monster.EVENT_DIE, this.removeBullet, this);
        this._target.on(Monster.EVENT_ENTER_HQ, this.removeBullet, this);
    }

    private removeBullet() {
        if (this.node.active) {
            this._target.targetOff(this);
            G.world.bulletsPool.put(this);
        }
    }

    protected override update(dt: number): void {
        // cc.assert(this._target.active, "Bullet target is not active!");
        const diff = this._target.position.sub(this.node.position);
        const distSqr = diff.magSqr();
        const size = Math.min(this._target.width, this._target.height) / 2;
        if (distSqr < size * size) {
            const monster = this._target.getComponent(Monster);
            cc.assert(monster != null, "Bullet target must be a monster!");
            monster.hp -= this._damage;
            this.removeBullet();
        } else {
            this.node.angle = angleTo(this.node.position, this._target.position);
            const dir = diff.normalizeSelf();
            this.node.position = this.node.position.add(dir.mul(this._speed * dt));
        }
    }
}
