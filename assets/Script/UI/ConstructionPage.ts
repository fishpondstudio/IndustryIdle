import { stringToGrid } from "../CoreGame/GridHelper";
import {
    BLD,
    getBuildingCount,
    getBuildingPermit,
    getBuildingPermitCost,
    getCostForBuilding,
    refundCash,
    trySpendCash,
} from "../CoreGame/Logic/Logic";
import { D, G } from "../General/GameData";
import { capitalize, ifTrue, nf } from "../General/Helper";
import { t } from "../General/i18n";
import { iconB, leftOrRight, uiHeaderRoute, uiHotkey } from "./UIHelper";
import { routeTo, showToast } from "./UISystem";

export function ConstructionPage(): m.Comp<{ xy: string }> {
    return {
        view: (vnode) => {
            const xy = vnode.attrs.xy;
            if (D.buildings[xy]) {
                routeTo("/inspect", { xy, left: m.route.param("left") });
                return null;
            }
            const entity = D.buildingsToConstruct[xy];
            if (!entity || !entity.construction || !BLD[entity.type]) {
                return null;
            }
            const buildingCost = () => getCostForBuilding(entity.type, 1);
            const buildingPermitCost = () => {
                const deficit = cc.misc.clampf(getBuildingCount() + 1 - getBuildingPermit(), 0, Infinity);
                return [getBuildingPermitCost(deficit), deficit];
            };
            const [permitCost, _] = buildingPermitCost();
            const cancelConstruction = () => {
                const entity = D.buildingsToConstruct[xy];
                if (entity.construction === "queueing") {
                    G.audio.playClick();
                    if (G.world.removeBuilding(stringToGrid(xy))) {
                        refundCash(buildingCost());
                    }
                    G.world.clearSelection();
                    routeTo("/main");
                } else if (entity.construction === "unpaid") {
                    G.audio.playClick();
                    G.world.removeBuilding(stringToGrid(xy));
                    G.world.clearSelection();
                    routeTo("/main");
                } else {
                    G.audio.playError();
                }
            };
            return m(".modal", { class: leftOrRight() }, [
                uiHeaderRoute(BLD[entity.type].name(), "/main"),
                m(
                    ".scrollable",
                    m(".box", [
                        ifTrue(entity.construction === "building" || entity.construction === "queueing", () => [
                            [m(".loader"), m(".sep10")],
                        ]),
                        m(".text-center", [
                            t("ConstructionStatus"),
                            ": ",
                            t(`ConstructionStatus${capitalize(entity.construction)}V2` as any, {
                                building: BLD[entity.type].name(),
                            }),
                        ]),
                        ifTrue(entity.construction === "unpaid" && D.unlockedBuildings[entity.type], () => [
                            m(".hr"),
                            m(
                                ".two-col.blue.pointer",
                                {
                                    onclick: () => {
                                        const [permitCost, permitAmount] = buildingPermitCost();
                                        if (entity.construction !== "unpaid" || !D.unlockedBuildings[entity.type]) {
                                            G.audio.playError();
                                        } else if (trySpendCash(buildingCost() + permitCost)) {
                                            G.audio.playClick();
                                            D.buildingPermit += permitAmount;
                                            entity.construction = "queueing";
                                            G.world.waveManager.redrawWormholePath();
                                        } else {
                                            G.audio.playError();
                                            showToast(t("NotEnoughCash"));
                                        }
                                    },
                                    "data-shortcut": "1-false-false-false",
                                },
                                [
                                    m("div", [
                                        uiHotkey({key: "1", ctrlKey: false, shiftKey: false, altKey: false} "", " "), 
                                        t("ConstructionStart")
                                    ]),
                                    m("div", [
                                        m("div", "$" + nf(buildingCost())),
                                        ifTrue(permitCost > 0, () =>
                                            m(
                                                ".text-desc.text-s",
                                                {
                                                    title: t("BuildingPermit"),
                                                },
                                                ["+$", nf(permitCost)]
                                            )
                                        ),
                                    ]),
                                ]
                            ),
                        ]),
                        ifTrue(entity.construction === "unpaid" && !D.unlockedBuildings[entity.type], () => [
                            m(".hr"),
                            m(".two-col.text-desc", [
                                m("div", t("ConstructionNotResearched")),
                                m(".ml10", iconB("lock")),
                            ]),
                        ]),
                        ifTrue(entity.construction !== "building", () => [
                            m(".hr"),
                            m(
                                ".two-col.red.pointer",
                                {
                                    onclick: cancelConstruction,
                                    "data-shortcut": "0-false-false-false",
                                },
                                [
                                    m("div", [
                                        uiHotkey({key: "0", ctrlKey: false, shiftKey: false, altKey: false} "", " "), 
                                        t("ConstructionCancel")
                                    ]),
                                    m("div", ["+$", nf(entity.construction === "unpaid" ? 0 : buildingCost())]),
                                ]
                            ),
                        ]),
                    ])
                ),
            ]);
        },
    };
}
