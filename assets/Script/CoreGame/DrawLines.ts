import { LINE_WIDTH } from "../General/Constants";
import { D, G, T } from "../General/GameData";
import { isStandby } from "../UI/UISystem";
import { DOT_OPACITY_DEFAULT, DOT_OPACITY_ENHANCED, DOT_OPACITY_FADED, getCurrentColor } from "./ColorThemes";
import { gridEqual, gridToString, stringToPosition } from "./GridHelper";

const { ccclass, property } = cc._decorator;

@ccclass
export default class DrawLines extends cc.Component {
    @property(cc.Camera) private camera: cc.Camera = null;
    @property(cc.Graphics) private graphics: cc.Graphics = null;
    public static onePixel: number;

    private hasColor = false;

    private upstream: Record<string, true> = {};
    private downstream: Record<string, true> = {};

    protected override start() {
        const freq = D.persisted.fps30 ? 0.5 : 0.1;
        this.schedule(this.redraw, freq, cc.macro.REPEAT_FOREVER);
        G.world.playerInput.onSelectionChange.on((change) => {
            if (change.new) {
                this.upstream = { [gridToString(change.new)]: true };
                this.downstream = { [gridToString(change.new)]: true };
            } else {
                this.upstream = {};
                this.downstream = {};
            }
            this.redraw();
        });
    }

    private redraw = () => {
        if (isStandby() || D.persisted.resourceMovement === "hide") {
            return;
        }

        const selected = G.world.playerInput.selectedGrid;
        this.graphics.clear();
        const color = getCurrentColor();
        const lines: Record<string, true> = {};

        const drawLine = (from: cc.Vec3, to: cc.Vec3, color: cc.Color, width = 1) => {
            const key = `${from.x},${from.y},${to.x},${to.y}`;
            if (!lines[key]) {
                lines[key] = true;
                this.graphics.strokeColor = color;
                this.graphics.lineWidth = (width * LINE_WIDTH) / this.camera.zoomRatio;
                this.graphics.moveTo(from.x, from.y);
                this.graphics.lineTo(to.x, to.y);
                this.graphics.stroke();
            }
        };

        if (selected && D.buildings[gridToString(selected)]) {
            Object.values(T.dots).forEach((v) => {
                if (this.upstream[v.toXy]) {
                    if (D.persisted.showSupplyChain) {
                        this.upstream[v.fromXy] = true;
                    }
                    const fromPos = stringToPosition(v.fromXy);
                    const toPos = stringToPosition(v.toXy);
                    const isDirect = gridEqual(v.toXy, selected);
                    const opacity = isDirect ? DOT_OPACITY_ENHANCED : DOT_OPACITY_DEFAULT;
                    drawLine(fromPos, toPos, color.red.clone().setA(opacity));
                    if (cc.isValid(v.dot)) {
                        v.dot.node.color = color.red;
                        v.dot.node.opacity = opacity;
                    }
                } else if (this.downstream[v.fromXy]) {
                    if (D.persisted.showSupplyChain) {
                        this.downstream[v.toXy] = true;
                    }
                    const fromPos = stringToPosition(v.fromXy);
                    const toPos = stringToPosition(v.toXy);
                    const isDirect = gridEqual(v.fromXy, selected);
                    const opacity = isDirect ? DOT_OPACITY_ENHANCED : DOT_OPACITY_DEFAULT;
                    drawLine(fromPos, toPos, color.green.clone().setA(opacity));
                    if (cc.isValid(v.dot)) {
                        v.dot.node.color = color.green;
                        v.dot.node.opacity = opacity;
                    }
                } else {
                    if (cc.isValid(v.dot)) {
                        v.dot.node.color = color.building;
                        v.dot.node.opacity =
                            D.persisted.resourceMovement === "show" || D.persisted.resourceMovement === "viewport"
                                ? DOT_OPACITY_FADED
                                : 0;
                    }
                }
            });
            this.hasColor = true;
        } else {
            if (this.hasColor) {
                Object.values(T.dots).forEach((v) => {
                    if (cc.isValid(v.dot)) {
                        v.dot.node.color = color.building;
                        v.dot.node.opacity =
                            D.persisted.resourceMovement === "show" || D.persisted.resourceMovement === "viewport"
                                ? DOT_OPACITY_DEFAULT
                                : 0;
                    }
                });
            }
            this.hasColor = false;
        }
    };
}
