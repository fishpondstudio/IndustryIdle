import { D, DLC, G, hasDLC } from "../General/GameData";
import { formatPercent, ifTrue, keysOf, nf, uuidv4 } from "../General/Helper";
import { t } from "../General/i18n";
import { iconB, uiHotkey } from "../UI/UIHelper";
import { showToast } from "../UI/UISystem";
import { gridToString, stringToGrid } from "./GridHelper";
import { Entity, WarehouseEntity } from "./Logic/Entity";
import { BLD, getAvailableResourcesForWarehouse, getFuelCostDiscount, RES, validateWarehouse } from "./Logic/Logic";
import {
    getWarehouseRouteCapacity,
    getWarehouseTargetRealCapacity,
    getWarehouseTotalCapacity,
} from "./Logic/Production";

export type SourceType = "source" | "target";

export function WarehouseSource(): m.Component<{
    direction: SourceType;
    entity: WarehouseEntity;
}> {
    let selecting = false;
    return {
        view: (vnode) => {
            const entity = vnode.attrs.entity;
            const visual = G.world.buildingVisuals[entity.grid];
            if (!visual) {
                return null;
            }
            const routes = entity[vnode.attrs.direction];
            const direction = vnode.attrs.direction;
            const shortcutKey = direction === "source" ? "5" : "6";
            return m(".box", [
                m(".title", direction === "source" ? t("WarehouseInputRoutes") : t("WarehouseOutputRoutes")),
                Object.keys(routes).map((k) => {
                    const route = routes[k];
                    const building = D.buildings[route.xy];
                    if (!RES[route.res] || !building) {
                        delete routes[k];
                        return null;
                    }
                    const resources =
                        direction === "source" ? getAvailableResourcesForWarehouse(building) : { ...entity.resources };
                    resources[route.res] = true;
                    return [
                        m(".hr"),
                        m(".two-col", [
                            m("div", [
                                m("div", BLD[building.type].name()),
                                m(".row.text-s.text-desc.mt5", [
                                    m("div", t("LevelN", { level: building.level })),
                                    m(".ml5.mr5", " · "),
                                    m(
                                        ".pointer",
                                        {
                                            onclick: () => {
                                                G.world.locate(stringToGrid(route.xy));
                                            },
                                        },
                                        t("WarehouseFindOnMap")
                                    ),
                                    m(".ml5.mr5", " · "),
                                    m(
                                        ".pointer",
                                        {
                                            onclick: () => {
                                                delete routes[k];
                                            },
                                        },
                                        t("WarehouseRemoveRoute")
                                    ),
                                ]),
                            ]),
                            m(
                                ".ml20",
                                m(
                                    "select.text-m",
                                    {
                                        onchange: (e) => {
                                            route.res = e.target.value;
                                        },
                                    },
                                    keysOf(resources)
                                        .sort((a, b) => RES[a].name().localeCompare(RES[b].name()))
                                        .map((k) =>
                                            m(
                                                "option",
                                                {
                                                    key: k,
                                                    value: k,
                                                    selected: route.res === k,
                                                },
                                                RES[k].name()
                                            )
                                        )
                                )
                            ),
                        ]),
                        m(".hr.dashed"),
                        m(
                            "div",
                            m("input.block", {
                                type: "range",
                                min: 1,
                                max: 100,
                                step: 1,
                                oninput: (e) => {
                                    route.weight = parseInt((e.target as HTMLInputElement).value, 10);
                                },
                                value: route.weight,
                            })
                        ),
                        m(".sep5"),
                        m(".row.text-s.text-desc", [
                            m("div", t("WarehouseSourceWeight", { weight: route.weight })),
                            m(
                                ".f1.text-center",
                                ifTrue(direction === "target", () => {
                                    return t("PerSecond", {
                                        time: nf(getWarehouseTargetRealCapacity(entity, 1, route)),
                                    });
                                })
                            ),
                            m(
                                "div",
                                t("PerSecond", {
                                    time: nf(getWarehouseRouteCapacity(entity, direction, route)),
                                })
                            ),
                        ]),
                    ];
                }),
                m(
                    ".action",
                    {
                        "data-shortcut": shortcutKey+"-false-false-false",
                        onclick: async () => {
                            if (selecting) {
                                G.audio.playError();
                                return;
                            }
                            try {
                                selecting = true;
                                G.audio.playClick();
                                cc.game.canvas.style.cursor = "cell";
                                const grid = await G.world.playerInput.hijackGridSelect();
                                const xy = gridToString(grid);
                                const building = D.buildings[xy];
                                if (!building) {
                                    throw new Error(t("WarehouseAddRouteFail"));
                                }
                                const resources =
                                    direction === "source"
                                        ? keysOf(getAvailableResourcesForWarehouse(building))
                                        : keysOf({ ...entity.resources });
                                resources.sort((a, b) => RES[a].name().localeCompare(RES[b].name()));
                                if (resources.length <= 0) {
                                    throw new Error(t("WarehouseAddRouteFail"));
                                }
                                G.audio.playClick();
                                routes[uuidv4()] = {
                                    xy: xy,
                                    res: resources[0],
                                    weight: 1,
                                };
                            } catch (error) {
                                G.audio.playError();
                                return showToast(error?.message ?? t("WarehouseAddRouteFail"));
                            } finally {
                                selecting = false;
                                cc.game.canvas.style.cursor = "";
                                m.redraw();
                            }
                        },
                    },
                    m(
                        ".row",
                        selecting
                            ? [iconB("highlight_alt", 18, 5), m("div", t("WarehouseTapToSelect"))]
                            : [
                                iconB("add_circle", 18, 5),
                                m("div", 
                                    [
                                        uiHotkey(
                                            {
                                                key: shortcutKey.toString(), 
                                                ctrlKey: false, 
                                                shiftKey: false, 
                                                altKey: false
                                            },
                                            "",
                                            " "
                                        ), 
                                        t("WarehouseAddInput")
                                    ]
                                ),
                              ]
                    )
                ),
            ]);
        },
    };
}

export function WarehousePanel(): m.Component<{ entity: Entity }> {
    return {
        view: (vnode) => {
            const entity = validateWarehouse(vnode.attrs.entity as WarehouseEntity);
            return [
                m(WarehouseSource, { entity, direction: "source" }),
                ifTrue(hasDLC(DLC[1]), () => m(WarehouseSource, { entity, direction: "target" })),
                m(".box", [
                    m(".two-col", [
                        m("div", [
                            m("div", t("InputCapacity")),
                            m(".text-s.text-desc", t("WarehouseInputCapacityDescV2")),
                        ]),
                        m(
                            ".ml20",
                            t("PerSecond", {
                                time: nf(getWarehouseTotalCapacity(entity)),
                            })
                        ),
                    ]),
                    m(".hr"),
                    m(".two-col", [
                        m("div", [
                            m("div", t("OutputCapacity")),
                            m(".text-s.text-desc", t("WarehouseInputCapacityDescV2")),
                        ]),
                        m(
                            ".ml20",
                            t("PerSecond", {
                                time: nf(getWarehouseTotalCapacity(entity)),
                            })
                        ),
                    ]),
                    m(".hr"),
                    m(".two-col", [
                        m("div", [m("div", t("FuelCostSave")), m(".text-s.text-desc", t("FuelCostSaveDescV2"))]),
                        m(".ml20.green", formatPercent(getFuelCostDiscount(entity))),
                    ]),
                ]),
            ];
        },
    };
}
