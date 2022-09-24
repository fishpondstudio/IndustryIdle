import BulletMovement from "../TowerDefense/BulletMovement";
import NodePoolManager from "./NodePoolManager";

const { ccclass, property } = cc._decorator;

@ccclass
export default class BulletsPool extends NodePoolManager<BulletMovement> {
    @property(cc.SpriteFrame) protected bullet: cc.SpriteFrame = null;

    protected override make(): BulletMovement {
        const node = new cc.Node("Bullet");
        const bm = node.addComponent(BulletMovement);
        const sprite = node.addComponent(cc.Sprite);
        sprite.spriteFrame = this.bullet;
        sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        node.opacity = 100;
        const rect = this.bullet.getRect();
        node.width = rect.width / 2;
        node.height = rect.height / 2;
        return bm;
    }

    public override putAll(): void {
        super.putAll(BulletMovement);
    }
}
