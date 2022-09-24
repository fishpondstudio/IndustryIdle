import { D, G, T } from "../../General/GameData";
import { getOrSet } from "../../General/Helper";
import { Buildings } from "../Buildings/BuildingDefinitions";
import { gridToPosition, stringToGrid, stringToPosition } from "../GridHelper";
import { Resources } from "../ResourceDefinitions";
import { Entity, getInput, WarehouseEntity } from "./Entity";

export function findClosestForResource(entity: Entity, res: keyof Resources, minRequired: number): Entity {
    let minDistSqr = Infinity;
    let target: Entity = null;
    T.resToBldCache[res].forEach((e) => {
        if (!isBuildingQualifiedForSourcing(res, e, entity, minRequired)) {
            return;
        }
        const distSqr = stringToPosition(e.grid).sub(stringToPosition(entity.grid)).magSqr();
        if (distSqr < minDistSqr && distSqr > 0) {
            target = e;
            minDistSqr = distSqr;
        }
    });

    return target;
}

export function sortByDistanceForResource(entity: Entity, res: keyof Resources): Entity[] {
    return T.resToBldCache[res]
        .filter((e) => isBuildingQualifiedForSourcing(res, e, entity, 0))
        .sort((a, b) => {
            return (
                stringToPosition(a.grid).sub(stringToPosition(entity.grid)).magSqr() -
                stringToPosition(b.grid).sub(stringToPosition(entity.grid)).magSqr()
            );
        });
}

export function buildingHasInput(e: Entity, res: keyof Resources): boolean {
    if (e.type === "TradeCenter") {
        return D.autoSellRes[res];
    }
    return getInput(e)[res] > 0;
}

function isBuildingQualifiedForSourcing(res: keyof Resources, from: Entity, to: Entity, minRequired: number) {
    const maxTile = getOrSet(to, "maxTile", 0);
    if (maxTile > 0) {
        const fromGrid = stringToGrid(from.grid);
        const toGrid = stringToGrid(to.grid);
        if (G.grid.distance(fromGrid, toGrid) > maxTile) {
            return false;
        }
    }
    // Can only pull from Warehouse if there's no outbound routes
    if (from.type === "Warehouse") {
        const warehouse = from as WarehouseEntity;
        return cc.js.isEmptyObject(warehouse.target);
    }
    return !buildingHasInput(from, res) && from.resources[res] && from.resources[res] >= minRequired;
}

export function findClosestDeposit(grid: cc.Vec3, type: keyof Resources, hasBuilding: boolean): [cc.Node, cc.Vec3] {
    let minDistSqr = Infinity;
    let minXy: string = null;
    let deposit: cc.Node = null;

    Object.keys(G.world.depositNodes).forEach((xy) => {
        const d = G.world.depositNodes[xy];
        const distSqr = stringToPosition(xy).sub(gridToPosition(grid)).magSqr();
        const bc = hasBuilding ? D.buildings[xy] : true;
        if (d.name === type && distSqr < minDistSqr && distSqr > 0 && bc) {
            deposit = d;
            minDistSqr = distSqr;
            minXy = xy;
        }
    });

    return [deposit, minXy === null ? null : stringToGrid(minXy)];
}

export function findByType(type: keyof Buildings): Entity {
    for (const key in D.buildings) {
        if (Object.prototype.hasOwnProperty.call(D.buildings, key)) {
            const e = D.buildings[key];
            if (e.type === type) {
                return e;
            }
        }
    }
    return null;
}

export function findClosestEmpty(grid: cc.Vec3) {
    let minDistSqr = Infinity;
    let minXy: string = null;

    G.grid.forEach((xy, pos) => {
        const distSqr = pos.sub(gridToPosition(grid)).magSqr();
        if (!G.world.depositNodes[xy] && !D.buildings[xy] && distSqr < minDistSqr && distSqr > 0) {
            minDistSqr = distSqr;
            minXy = xy;
        }
    });

    return minXy === null ? null : stringToGrid(minXy);
}
