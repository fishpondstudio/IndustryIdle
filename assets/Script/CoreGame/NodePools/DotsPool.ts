import NodePoolManager from "./NodePoolManager";

const { ccclass, property } = cc._decorator;

@ccclass
export default class DotsPool extends NodePoolManager<cc.Sprite> {
    @property(cc.SpriteFrame) protected sprite: cc.SpriteFrame = null;

    protected override make(): cc.Sprite {
        const node = new cc.Node("Dot");
        node.attr({ t: Date.now() });
        const sprite = node.addComponent(cc.Sprite);
        sprite.spriteFrame = this.sprite;
        sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        const rect = this.sprite.getRect();
        node.width = rect.width / 2;
        node.height = rect.height / 2;
        return sprite;
    }
}
