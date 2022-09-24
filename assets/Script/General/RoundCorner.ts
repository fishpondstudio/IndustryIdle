const { ccclass, property, executeInEditMode } = cc._decorator;

@ccclass
@executeInEditMode
export default class RoundCorner extends cc.Component {
    @property()
    private radiusInPx = 0;

    override onLoad() {
        this.getComponents(cc.RenderComponent).forEach((renderComponent) => {
            let xRadiux = this.radiusInPx / this.node.width;
            xRadiux = xRadiux >= 0.5 ? 0.5 : xRadiux;
            let yRadius = this.radiusInPx / this.node.height;
            yRadius = yRadius >= 0.5 ? 0.5 : yRadius;
            const material: cc.Material = renderComponent.getMaterial(0);
            material.setProperty("xRadius", xRadiux);
            material.setProperty("yRadius", yRadius);
            renderComponent.setMaterial(0, material);
        });
    }
}
