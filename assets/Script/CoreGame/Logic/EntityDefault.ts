import { Entity } from "./Entity";

export type EntityDefaultType = Pick<
    Entity,
    "turnOff" | "highPriority" | "partialTransport" | "inputOverrideFallback" | "inputBuffer" | "inputCapacityOverride"
>;

export function getEntityDefault(): EntityDefaultType {
    return {
        turnOff: false,
        highPriority: false,
        partialTransport: false,
        inputOverrideFallback: "skip",
        inputBuffer: "auto",
        inputCapacityOverride: "x1",
    } as const;
}
