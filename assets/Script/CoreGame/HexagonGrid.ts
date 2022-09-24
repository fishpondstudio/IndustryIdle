import { forEach } from "../General/Helper";
import { getCurrentColor } from "./ColorThemes";
import { Grid, gridToString, pointToVec3 } from "./GridHelper";

export class HexagonGrid extends Grid {
    private hexConfig: Honeycomb.GridFactory<Honeycomb.Hex<{ size: number }>>;
    private hexCenters: Record<string, cc.Vec3> = {};
    private hexCorners: Record<string, cc.Vec3[]> = {};
    private hexSize: cc.Vec2;
    private hexGrid: Honeycomb.Grid<Honeycomb.Hex<{ size: number }>>;
    private hex: Honeycomb.HexFactory<{ size: number }>;
    private tileSize: number;
    private maxTile: number;
    constructor(maxTile: number, tileSize: number) {
        super(maxTile, tileSize);
        this.maxTile = maxTile;
        this.tileSize = tileSize;
        this.hex = Honeycomb.extendHex({ size: tileSize });
        this.hexConfig = Honeycomb.defineGrid(this.hex);
        this.hexGrid = this.hexConfig.rectangle({
            width: maxTile,
            height: maxTile,
        });

        this.hexGrid.forEach((hex) => {
            const point = hex.toPoint();
            const corners = hex.corners().map((c) => pointToVec3(c.add(point)));
            const center = hex.center();
            corners.push(corners[0]);
            const key = gridToString(hex);
            this.hexCenters[key] = Object.freeze(pointToVec3(point.add(center)));
            this.hexCorners[key] = corners;
            return corners;
        });

        this.hexSize = cc.v2(this.hexGrid.pointWidth(), this.hexGrid.pointHeight());
    }

    public getSize(): cc.Vec2 {
        return this.hexSize;
    }

    public getMaxTile(): number {
        return this.maxTile;
    }

    public getTileSize(): number {
        return this.tileSize;
    }

    public forEach(func: (xy: string, position: cc.Vec3) => void): void {
        forEach(this.hexCenters, func);
    }

    public gridToPosition(grid: cc.Vec3): cc.Vec3 {
        return this.stringToPosition(gridToString(grid));
    }

    public stringToPosition(xy: string): cc.Vec3 {
        const pos = this.hexCenters[xy];
        if (!pos) {
            cc.warn(`gridToPosition: grid ${xy} is out of range`);
            return null;
        }
        return pos;
    }

    public positionToGrid(pos: cc.Vec3): cc.Vec3 {
        const g = this.hexConfig.pointToHex(pos.x, pos.y);
        if (this.hexCenters[gridToString(g)]) {
            return cc.v3(g.x, g.y);
        }
        return null;
    }

    public drawGrid(g: cc.Graphics) {
        g.strokeColor = getCurrentColor().grid;
        forEach(this.hexCorners, (grid, corners) => {
            this.drawCorners(g, corners);
        });
    }

    public drawSelected(g: cc.Graphics, selected: cc.Vec3) {
        this.drawCorners(g, this.hexCorners[gridToString(selected)]);
    }

    public getAdjacent(grid: cc.Vec3): cc.Vec3[] {
        return this.hexGrid.neighborsOf(this.hex(grid.x, grid.y)).map((h) => cc.v3(h.x, h.y));
    }

    private drawCorners(g: cc.Graphics, corners: { x: number; y: number }[]) {
        corners.forEach((point, i) => {
            if (i === 0) {
                g.moveTo(point.x, point.y);
            } else {
                g.lineTo(point.x, point.y);
            }
        });
        g.stroke();
    }
    public distance(from: cc.Vec3, to: cc.Vec3): number {
        return this.hex(from.x, from.y).distance(this.hex(to.x, to.y));
    }
}
