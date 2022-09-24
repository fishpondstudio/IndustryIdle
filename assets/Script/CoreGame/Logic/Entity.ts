import { firstKeyOf, hasProperty } from "../../General/Helper";
import { t } from "../../General/i18n";
import { Buildings, ResourceNumberMap } from "../Buildings/BuildingDefinitions";
import { Resources } from "../ResourceDefinitions";
import { addDefenseModule, BASE_MODULE_MIN } from "../TowerDefense/DefenseModules";
import { BLD, Weapon } from "./Logic";

export function makeEntity(xy: string, type: keyof Buildings, resources: ResourceNumberMap = {}): Entity {
    const entity: Entity = {
        grid: xy,
        type,
        level: 1,
        resources,
        turnOff: false,
        tickSec: 1,
        maxTile: 0,
        highPriority: false,
        partialTransport: false,
        inputOverride: {},
        inputOverrideFallback: "skip",
        inputBuffer: "auto",
        inputCapacityOverride: "x1",
    };
    if (type === "Warehouse") {
        const e = entity as WarehouseEntity;
        e.source = {};
        e.target = {};
        return e;
    }
    if (type === "PowerBank") {
        const e = entity as PowerBankEntity;
        e.powerLeft = 0;
        return e;
    }
    if (type === "FlourMill") {
        const e = entity as FlourMillEntity;
        e.ratio = 0.5;
    }
    if (type === "DefenseCommand") {
        const e = entity as DefenseCommandEntity;
        e.modules = [];
        e.inputResource = firstKeyOf(Weapon);
        e.range = BASE_MODULE_MIN.range;
        e.bulletSpeed = BASE_MODULE_MIN.bulletSpeed;
        e.attackSpeed = BASE_MODULE_MIN.attackSpeed;
        addDefenseModule(e);
    }
    if (BLD[type].recipes) {
        const e = entity as MultipleRecipeEntity;
        e.recipe = firstKeyOf(BLD[type].recipes());
    }
    return entity;
}

export type ConstructionStatus = "queueing" | "building" | "unpaid";

export const InputBufferTypes = {
    auto: () => t("InputBufferTypeAuto"),
    stockpile: () => t("InputBufferTypeStockpile"),
    x2: () => "2x",
    x5: () => "5x",
    x10: () => "10x",
    x20: () => "20x",
    x50: () => "50x",
    x100: () => "100x",
} as const;

export const InputCapacityOverrideTypes = {
    x0_5: () => "50%",
    x1: () => "100%",
    x1_5: () => "150%",
    x2: () => "200%",
    x5: () => "500%",
    x10: () => "1000%",
} as const;

export const InputCapacityOverrideValues: Record<InputCapacityOverride, number> = {
    x0_5: 0.5,
    x1: 1,
    x1_5: 1.5,
    x2: 2,
    x5: 5,
    x10: 10,
} as const;

export type InputBuffer = keyof typeof InputBufferTypes;
export type InputCapacityOverride = keyof typeof InputCapacityOverrideTypes;

export class Entity {
    grid: string;
    type: keyof Buildings;
    level: number;
    resources: ResourceNumberMap;
    turnOff: boolean;
    maxTile: number;
    tickSec: number;
    highPriority: boolean;
    partialTransport: boolean;
    construction?: ConstructionStatus;
    inputOverride: Partial<Record<keyof Resources, string>>;
    inputOverrideFallback: InputOverrideFallback;
    inputBuffer: InputBuffer;
    inputCapacityOverride: InputCapacityOverride;
}

export class WarehouseEntity extends Entity {
    source: Record<string, IWarehouseSource> = {};
    target: Record<string, IWarehouseSource> = {};
}

export function getInput(entity: Entity): ResourceNumberMap {
    let type = entity.type;
    if (hasProperty(entity, "recipe")) {
        const e = entity as MultipleRecipeEntity;
        type = e.recipe;
    }
    const b = BLD[type];
    return b.input ? b.input(entity) : b.staticInput;
}

export function getOutput(entity: Entity): ResourceNumberMap {
    let type = entity.type;
    if (hasProperty(entity, "recipe")) {
        const e = entity as MultipleRecipeEntity;
        type = e.recipe;
    }
    const b = BLD[type];
    return b.output ? b.output(entity) : b.staticOutput;
}

export interface IWarehouseSource {
    xy: string;
    res: keyof Resources;
    weight: number;
}

export class PowerBankEntity extends Entity {
    powerLeft: number;
}

export class MultipleRecipeEntity extends Entity {
    recipe: keyof Buildings;
}

export class ResourceExplorerEntity extends MultipleRecipeEntity {}

export class GreenhouseEntity extends MultipleRecipeEntity {}

export class FarmlandEntity extends MultipleRecipeEntity {}

export class FlourMillEntity extends Entity {
    ratio: number;
}

export class DefenseCommandEntity extends Entity implements IBaseModule {
    inputResource: keyof Resources;
    modules: IDefenseModule[];
    range: number;
    bulletSpeed: number;
    attackSpeed: number;
}

export interface IBaseModule {
    range: number;
    bulletSpeed: number;
    attackSpeed: number;
}

export interface IDefenseModule {
    criticalDamageChance: number;
    criticalDamageMultiplier: number;
    damage: number;
}

export type InputOverrideFallback = "skip" | "drain" | "auto";
