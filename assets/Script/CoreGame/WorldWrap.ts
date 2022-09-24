const { ccclass, property } = cc._decorator;

@ccclass
export default class WorldWrap extends cc.Component {
    @property(cc.Camera) protected camera: cc.Camera = null;

    protected override update() {
        let maxX = -Infinity;
        let minX = Infinity;
        const cameraMaxX = this.camera.node.position.x + cc.winSize.width / this.camera.zoomRatio / 2;
        const cameraMinX = this.camera.node.position.x - cc.winSize.width / this.camera.zoomRatio / 2;
        this.node.children.forEach((c) => {
            maxX = Math.max(maxX, c.position.x + c.width / 2);
            minX = Math.min(minX, c.position.x - c.width / 2);
        });
        const world = this.node.children[0];
        if (cameraMaxX > maxX) {
            const clone = cc.instantiate(world);
            clone.parent = this.node;
            clone.position = cc.v3(maxX + world.width / 2, 0);
            maxX += world.width;
        }
        if (cameraMinX < minX) {
            const clone = cc.instantiate(world);
            clone.parent = this.node;
            clone.position = cc.v3(minX - world.width / 2, 0);
            minX -= world.width;
        }
        this.node.children.forEach((c) => {
            if (c.position.x + c.width / 2 < cameraMinX) {
                c.destroy();
            }
            if (c.position.x - c.width / 2 > cameraMaxX) {
                c.destroy();
            }
        });
    }
}
