import { NativeSdk } from "../General/NativeSdk";

const { ccclass, property } = cc._decorator;

@ccclass
export default class RewardAdIcon extends cc.Component {
    @property(cc.Node) private sprite: cc.Node = null;

    public onClick() {
        // routeTo("/reward-ad");
    }

    protected override onLoad() {
        this.sprite.active = false;
        NativeSdk.loadAd();
        this.checkForAds();
        this.schedule(this.checkForAds, 1);
    }

    private checkForAds() {
        NativeSdk.canShowRewardVideo().then((can) => {
            if (can) {
                if (this.sprite.active) {
                    return;
                }
                this.sprite.active = true;
                this.sprite.x = 100;
                cc.tween(this.sprite)
                    .to(1, { x: 0 }, { easing: cc.easing.smooth })
                    .repeatForever(
                        cc
                            .tween()
                            .to(0.1, { angle: -5 })
                            .to(0.1, { angle: 5 })
                            .to(0.1, { angle: -5 })
                            .to(0.1, { angle: 5 })
                            .to(0.1, { angle: -5 })
                            .to(0.1, { angle: 5 })
                            .to(0.1, { angle: -5 })
                            .to(0.1, { angle: 5 })
                            .to(0.05, { angle: 0 })
                            .delay(5)
                    )
                    .start();
            } else {
                this.sprite.stopAllActions();
                this.sprite.active = false;
            }
        });
    }
}
