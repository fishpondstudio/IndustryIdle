import { D, G, T } from "../../General/GameData";
import { assert } from "../../General/Helper";
import EntityVisual from "../EntityVisual";
import { gridToString, stringToGrid } from "../GridHelper";
import { Entity, getInput, getOutput } from "../Logic/Entity";
import { addResourceTo, BLD, ensureRecipe, isChristmas, isHalloween, isLunarNewYear, isMine } from "../Logic/Logic";
import {
    addBoostAmount,
    getFactoryMiningDeposit,
    getInputAmount,
    getOutputAmount,
    getPowerPlantScienceProduction,
    hasEnoughPower,
    tryDeductPower,
} from "../Logic/Production";
import { isPolicyActive } from "../Logic/SelfContained";
import { Resources } from "../ResourceDefinitions";

export function tickGeneral(v: EntityVisual): void {
    if (v.entity.turnOff) {
        return;
    }
    const powerUsage = v.getPowerUsage();
    v.notEnoughResources = !v.hasEnoughResources();
    v.notEnoughPower = !hasEnoughPower(powerUsage);
    T.next.powerRequired += powerUsage;
    const deposit = getFactoryMiningDeposit(v.entity);
    if (!v.notEnoughPower && deposit) {
        addResourceTo(v.entity, deposit, getInputAmount(v.entity, deposit) * v.cumulatedTicks, true);
    }
    if (!v.notEnoughResources && !v.notEnoughPower) {
        v.isWorking = true;
        assert(tryDeductPower(powerUsage), `Should always have enough power here! ${v.entity.type}, ${v.entity.grid}`);
        v.convertInputToOutput();
    }
}

export function tickMine(v: EntityVisual): void {
    if (!isMine(v.entity.type)) {
        cc.warn("You are calling `tickMine` when `isMine` return false");
    }
    if (v.entity.turnOff) {
        return;
    }
    const deposit = G.world.depositNodes[v.entity.grid];
    const powerUsage = v.getPowerUsage();
    if (!deposit || !getOutput(v.entity)[deposit.name]) {
        v.isWorking = false;
        return;
    }
    const level = deposit.getAttr<number>("level");
    if (isFinite(level) && v.entity.level > level) {
        v.isWorking = false;
        return;
    }
    const res = deposit.name as keyof Resources;
    if (tryDeductPower(powerUsage)) {
        T.next.powerRequired += powerUsage;
        addResourceTo(v.entity, res, getOutputAmount(v.entity, res) * v.cumulatedTicks, true);
        v.isWorking = true;
    } else {
        T.next.powerRequired += powerUsage;
        v.isWorking = false;
        v.notEnoughPower = true;
    }
    if (isPolicyActive("MineBooster")) {
        boostAdjacentBuilding(v, 1, (entity) => isMine(entity.type) || getInput(entity)[res] > 0);
    }
}

export function tickPowerPlant(v: EntityVisual): void {
    if (BLD[v.entity.type].power <= 0) {
        cc.warn("You are calling `tickPowerPlant` when `power < 0`");
    }
    if (v.entity.turnOff) {
        return;
    }
    const deposit = getFactoryMiningDeposit(v.entity);
    if (deposit) {
        addResourceTo(v.entity, deposit, getInputAmount(v.entity, deposit) * v.cumulatedTicks, true);
    }
    const powerUsage = v.getPowerUsage();
    v.notEnoughResources = !v.hasEnoughResources();
    if (!v.notEnoughResources && powerUsage < 0) {
        v.convertInputToOutput();
        T.next.powerSupply += Math.abs(powerUsage);
        addResourceTo(v.entity, "Sci", getPowerPlantScienceProduction(v.entity) * v.cumulatedTicks, true);
        if (isHalloween()) {
            addResourceTo(v.entity, "Pmpk", Math.pow(Math.abs(powerUsage), 0.5) * v.cumulatedTicks, true);
        }
        if (isChristmas()) {
            addResourceTo(v.entity, "Rndr", Math.pow(Math.abs(powerUsage), 0.5) * v.cumulatedTicks, true);
        }
        if (isLunarNewYear()) {
            addResourceTo(v.entity, "Ltrn", Math.pow(Math.abs(powerUsage), 0.5) * v.cumulatedTicks, true);
        }
    }
    v.isWorking = powerUsage < 0 && !v.notEnoughResources;
}

export function tickMultipleRecipe(v: EntityVisual): void {
    ensureRecipe(v.entity);
    tickGeneral(v);
}

export function boostAdjacentBuilding(
    v: EntityVisual,
    boostPercentage: number,
    boostRequirement: (entity: Entity) => boolean
): void {
    G.grid.getAdjacent(stringToGrid(v.entity.grid)).forEach((grid) => {
        const xy = gridToString(grid);
        const entity = D.buildings[xy];
        if (entity && boostRequirement(entity)) {
            // Add "stable" regardless of the building is working or not
            addBoostAmount(T.next.boostsStable, entity.grid, entity.type, [boostPercentage, boostPercentage]);
            if (v.isWorking) {
                addBoostAmount(T.next.boosts, entity.grid, entity.type, [boostPercentage, boostPercentage]);
            }
        }
    });
}
