import { D } from "../../General/GameData";
import { Policy } from "../PolicyDefinitions";

export function isPolicyActive(p: keyof Policy) {
    return D.policies[p] && D.policies[p].active;
}
