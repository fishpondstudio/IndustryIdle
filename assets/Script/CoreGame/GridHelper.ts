import { G } from "../General/GameData";
import { Point } from "../Shared/CommonDataTypes";

export const HIGHLIGHT_EXTRA_WIDTH = 1.25;

export abstract class Grid {
    constructor(maxTile: number, tileSize: number) {}
    public abstract gridToPosition(grid: cc.Vec3): cc.Vec3;
    public abstract positionToGrid(pos: cc.Vec3): cc.Vec3;
    public abstract stringToPosition(xy: string): cc.Vec3;
    public abstract getSize(): cc.Vec2;
    public abstract getMaxTile(): number;
    public abstract getTileSize(): number;
    public abstract forEach(func: (xy: string, position: cc.Vec3) => void): void;
    public abstract drawGrid(g: cc.Graphics): void;
    public abstract drawSelected(g: cc.Graphics, selected: cc.Vec3): void;
    public abstract getAdjacent(grid: cc.Vec3): cc.Vec3[];
    public abstract distance(from: cc.Vec3, to: cc.Vec3): number;
}

export function gridToPosition(grid: cc.Vec3): cc.Vec3 {
    return G.grid.gridToPosition(grid);
}

export function stringToPosition(xy: string): cc.Vec3 {
    return G.grid.stringToPosition(xy);
}

export function pointToVec3(point: { x: number; y: number }) {
    return cc.v3(point.x, point.y);
}

export function gridToString(grid: { x: number; y: number }): string {
    return `${grid.x},${grid.y}`;
}

export function stringToGrid(grid: string): cc.Vec3 {
    const parts = grid.split(",");
    return cc.v3(parseInt(parts[0], 10), parseInt(parts[1], 10));
}

export function stringToPoint(grid: string): Point {
    const parts = grid.split(",");
    return { x: parseInt(parts[0], 10), y: parseInt(parts[1], 10) };
}

export function gridEqual(a: string | cc.Vec3, b: string | cc.Vec3) {
    if (!a || !b) {
        return false;
    }
    if (a instanceof cc.Vec3 && b instanceof cc.Vec3) {
        return a.equals(b);
    }
    const strA = typeof a === "string" ? a : `${a.x},${a.y}`;
    const strB = typeof b === "string" ? b : `${b.x},${b.y}`;
    return strA === strB;
}
