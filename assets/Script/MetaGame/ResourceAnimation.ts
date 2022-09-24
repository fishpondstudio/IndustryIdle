import { G } from "../General/GameData";

const { ccclass, property } = cc._decorator;

@ccclass
export default class ResourceAnimation extends cc.Component {
    @property(cc.Node) private target: cc.Node = null;

    public play(onStep: () => void, steps: number) {
        const mid = cc.v3(cc.winSize.width / 2, cc.winSize.height / 2);
        G.audio.playEffect(G.audio.freechest);
        for (let i = 0; i < steps; i++) {
            const g = cc.instantiate(this.node);
            g.parent = this.node.parent;
            g.scale = 0.5;
            g.follow(cc.Camera.findCamera(this.node).node);
            g.opacity = 0;
            cc.tween(g)
                .to(
                    0.8 + cc.randf(0, 0.2),
                    {
                        position: g.position.add(cc.v3(cc.randf(-100, 100), cc.randf(-100, 100))),
                        opacity: 255,
                        scale: 1,
                    },
                    { easing: cc.easing.quadInOut }
                )
                .delay(0.5 + i * 0.1)
                .to(
                    1,
                    {
                        position: g.relativeFrom(this.target),
                        scale: 0.5,
                        opacity: 0,
                    },
                    { easing: cc.easing.quadInOut }
                )
                .call(() => {
                    onStep();
                    G.audio.playEffect(G.audio.gold);
                })
                .start();
        }
    }
}
