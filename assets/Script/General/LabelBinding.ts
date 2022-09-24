import { D } from "./GameData";
import { nf } from "./Helper";

const { ccclass, property } = cc._decorator;

@ccclass
export default class LabelBinding extends cc.Component {
    @property() private property = "";
    @property() private prefix = "";
    @property() private postfix = "";
    @property private formatNumber = false;

    private label: cc.Label;
    private current: number;

    protected override onLoad() {
        this.label = this.getComponent(cc.Label);
        if (!this.property) {
            cc.error("Please set `property` for LabelBinding");
        }
        this.current = D[this.property];
        this.updateLabel();
    }

    protected override update() {
        if (this.current !== D[this.property]) {
            this.current = D[this.property];
            this.updateLabel();
        }
    }

    private updateLabel() {
        let content = this.current.toString();
        if (this.formatNumber) {
            content = nf(this.current);
        }
        this.label.string = this.prefix + content + this.postfix;
    }
}
