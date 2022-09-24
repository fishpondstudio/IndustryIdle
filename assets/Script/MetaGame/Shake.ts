const { ccclass, property } = cc._decorator;

@ccclass
export default class Shake extends cc.Component {
    @property private delay = 3;

    protected override onLoad() {
        cc.tween(this.node)
            .repeatForever(
                cc
                    .tween()
                    .to(0.1, { angle: -5 })
                    .to(0.1, { angle: 5 })
                    .to(0.1, { angle: -5 })
                    .to(0.1, { angle: 5 })
                    .to(0.1, { angle: -5 })
                    .to(0.1, { angle: 5 })
                    .to(0.05, { angle: 0 })
                    .delay(this.delay)
            )
            .start();
    }
}
