import { G } from "../General/GameData";

const { ccclass, property } = cc._decorator;

export class EntityFlying extends cc.Component {
    @property(cc.Node) protected target: cc.Node = null;

    protected makeNode() {
        const n = cc.instantiate(this.node);
        n.parent = this.node.parent;
        return n;
    }

    protected animate(n: cc.Node, from: cc.Vec3) {
        n.setWorldPosition(from);
        const originalScale = n.scale;
        n.scale = 0;
        n.opacity = 0;
        G.audio.playGold();
        cc.tween(n)
            .to(0.2, { scale: originalScale, opacity: 255 }, { easing: cc.easing.quadIn })
            .parallel(
                cc.tween().to(
                    1,
                    {
                        position: this.target.getWorldPosition(),
                        opacity: 100,
                        scale: originalScale * 0.5,
                    },
                    { easing: cc.easing.quadIn }
                ),
                cc.tween().repeat(2, cc.tween().delay(0.2).to(0.15, { scaleX: 0 }).to(0.15, { scaleX: 1 }))
            )
            .call(() => n.destroy())
            .start();
    }
}

@ccclass
export default class GoldFlying extends EntityFlying {
    public play(from: cc.Vec3) {
        this.animate(this.makeNode(), from);
    }
}
