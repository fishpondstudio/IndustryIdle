const { ccclass, property } = cc._decorator;

@ccclass
export default class AutoResizeCanvas extends cc.Component {
    private widget: cc.Widget;

    protected override onLoad() {
        this.widget = this.getComponent(cc.Widget);
        this.applySafeAreaFix();
    }

    private applySafeAreaFix() {
        const ratio = cc.winSize.width / cc.view.getFrameSize().width;
        const top = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--sait"), 10) || 0;
        const bottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--saib"), 10) || 0;
        const left = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--sail"), 10) || 0;
        const right = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--sair"), 10) || 0;
        if (this.widget) {
            // Mostly copied from https://github.com/cocos-creator/engine/blob/master/cocos2d/core/components/CCSafeArea.js
            this.widget.updateAlignment();
            const lastPos = this.node.position;
            const lastAnchorPoint = this.node.getAnchorPoint();
            this.widget.isAlignTop =
                this.widget.isAlignBottom =
                this.widget.isAlignLeft =
                this.widget.isAlignRight =
                    true;
            this.widget.top = top * ratio;
            this.widget.bottom = bottom * ratio;
            this.widget.left = left * ratio;
            this.widget.right = right * ratio;
            this.widget.updateAlignment();
            const curPos = this.node.position;
            const anchorX = lastAnchorPoint.x - (curPos.x - lastPos.x) / this.node.width;
            const anchorY = lastAnchorPoint.y - (curPos.y - lastPos.y) / this.node.height;
            this.node.setAnchorPoint(anchorX, anchorY);
        }
    }
}
