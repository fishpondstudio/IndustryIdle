const { ccclass, property } = cc._decorator;

@ccclass
export default class Pointer extends cc.Component {
    protected override onEnable() {
        this.node.on(cc.Node.EventType.MOUSE_ENTER, onMouseEnter.bind(this, this.node));
        this.node.on(cc.Node.EventType.MOUSE_LEAVE, onMouseLeave.bind(this, this.node));
    }

    protected override onDisable() {
        onMouseLeave(this.node);
        this.node.off(cc.Node.EventType.MOUSE_ENTER, onMouseEnter.bind(this, this.node));
        this.node.off(cc.Node.EventType.MOUSE_LEAVE, onMouseLeave.bind(this, this.node));
    }
}

function onMouseEnter(node: cc.Node) {
    if (node.opacity > 0 && node.scale !== 0) {
        cc.game.canvas.style.cursor = "pointer";
    }
}

function onMouseLeave(node: cc.Node) {
    if (node.opacity > 0 && node.scale !== 0) {
        cc.game.canvas.style.cursor = "default";
    }
}
