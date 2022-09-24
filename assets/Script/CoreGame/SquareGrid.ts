import { forEach } from "../General/Helper";
import { getCurrentColor } from "./ColorThemes";
import { Grid, gridToString } from "./GridHelper";

export class SquareGrid extends Grid {
    private centers: Record<string, cc.Vec3> = {};
    private size: cc.Vec2;
    private tileSize: number;
    private maxTile: number;
    constructor(maxTile: number, tileSize: number) {
        super(maxTile, tileSize);
        this.tileSize = tileSize;
        this.maxTile = maxTile;
        for (let x = 0; x < maxTile; x++) {
            for (let y = 0; y < maxTile; y++) {
                this.centers[`${x},${y}`] = Object.freeze(cc.v3((x + 0.5) * tileSize, (y + 0.5) * tileSize));
            }
        }
        this.size = cc.v2(maxTile * tileSize, maxTile * tileSize);
    }

    public getSize(): cc.Vec2 {
        return this.size;
    }

    public getMaxTile(): number {
        return this.maxTile;
    }

    public getTileSize(): number {
        return this.tileSize;
    }

    public forEach(func: (xy: string, position: cc.Vec3) => void): void {
        forEach(this.centers, func);
    }

    public gridToPosition(grid: cc.Vec3): cc.Vec3 {
        return this.stringToPosition(gridToString(grid));
    }

    public stringToPosition(xy: string): cc.Vec3 {
        const pos = this.centers[xy];
        if (!pos) {
            cc.warn(`gridToPosition: grid ${xy} is out of range`);
            return null;
        }
        return pos;
    }

    public getAdjacent(grid: cc.Vec3): cc.Vec3[] {
        return [cc.v3(0, 1), cc.v3(0, -1), cc.v3(1, 0), cc.v3(-1, 0)].map((a) => a.addSelf(grid));
    }

    public positionToGrid(pos: cc.Vec3): cc.Vec3 {
        const x = Math.floor(pos.x / this.tileSize);
        const y = Math.floor(pos.y / this.tileSize);
        if (this.centers[gridToString({ x, y })]) {
            return cc.v3(x, y);
        }
        return null;
    }

    public drawGrid(g: cc.Graphics) {
        g.strokeColor = getCurrentColor().grid;
        const size = this.getSize();
        for (let x = 0; x < this.maxTile; x++) {
            g.moveTo(x * this.tileSize, 0);
            g.lineTo(x * this.tileSize, size.y);
            g.stroke();
        }
        for (let y = 0; y < this.maxTile; y++) {
            g.moveTo(0, y * this.tileSize);
            g.lineTo(size.x, y * this.tileSize);
            g.stroke();
        }
    }

    public drawSelected(g: cc.Graphics, selected: cc.Vec3) {
        const pos = this.gridToPosition(selected);
        g.moveTo(pos.x - this.tileSize / 2, pos.y - this.tileSize / 2);
        g.lineTo(pos.x + this.tileSize / 2, pos.y - this.tileSize / 2);
        g.lineTo(pos.x + this.tileSize / 2, pos.y + this.tileSize / 2);
        g.lineTo(pos.x - this.tileSize / 2, pos.y + this.tileSize / 2);
        g.lineTo(pos.x - this.tileSize / 2, pos.y - this.tileSize / 2);
        g.stroke();
    }

    public distance(from: cc.Vec3, to: cc.Vec3): number {
        return Math.max(Math.abs(from.x - to.x), Math.abs(from.y - to.y));
    }
}
