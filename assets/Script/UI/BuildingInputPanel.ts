import EntityVisual from "../CoreGame/EntityVisual";
import { gridToString } from "../CoreGame/GridHelper";
import { Entity, getInput, getOutput } from "../CoreGame/Logic/Entity";
import { getFuelCostPerResource, RES } from "../CoreGame/Logic/Logic";
import { getFactoryMiningDeposit, getInputAmount } from "../CoreGame/Logic/Production";
import { Resources } from "../CoreGame/ResourceDefinitions";
import { D, DLC, G, hasDLC } from "../General/GameData";
import { formatPercent, getOrSet, ifTrue, keysOf, nf, sizeOf } from "../General/Helper";
import { t } from "../General/i18n";
import { showToast } from "./UISystem";

export function BuildingInputPanel(): m.Component<{
    entity: Entity;
    visual: EntityVisual;
    boostAmount: [number, number];
}> {
    let selecting: keyof Resources = null;
    return {
        view: (vnode) => {
            const entity = vnode.attrs.entity;
            const visual = vnode.attrs.visual;
            const boostAmount = vnode.attrs.boostAmount;
            const notEnoughFuel = visual.notEnoughFuel;
            const input = getInput(entity);

            if (sizeOf(input) <= 0) {
                return null;
            }
            const fuelCosts = getFuelCostPerResource(entity);
            const factoryMiningDeposit = getFactoryMiningDeposit(entity);

            return m("div", [
                m(".hr"),
                m(".title.two-col", [
                    m("div", t("InputCapacity")),
                    m("div", [
                        ifTrue(notEnoughFuel, () => [
                            m(
                                ".red",
                                t("BuildingNotEnoughFuel", {
                                    fuel: RES[D.fuelResType].name(),
                                })
                            ),
                        ]),
                        ifTrue(!notEnoughFuel && boostAmount[0] > 0, () => [
                            m(
                                ".text-s.text-desc.green",
                                {
                                    title: t("ResourceBoosterPercentageV2", {
                                        percent: formatPercent(boostAmount[0]),
                                    }),
                                },
                                `+${formatPercent(boostAmount[0])}`
                            ),
                        ]),
                    ]),
                ]),
                keysOf(input).map((r) => {
                    const notEnoughResource =
                        visual.notEnoughResources && getInputAmount(entity, r) > entity.resources[r];
                    const selectRoute = async () => {
                        try {
                            cc.game.canvas.style.cursor = "cell";
                            selecting = r;
                            const grid = await G.world.playerInput.hijackGridSelect();
                            selecting = null;
                            const xy = gridToString(grid);
                            if (xy === entity.grid || !D.buildings[xy]) {
                                G.audio.playError();
                                showToast(t("BuildingSourceInvalid"));
                                return;
                            }
                            G.audio.playClick();
                            entity.inputOverride[r] = xy;
                        } finally {
                            cc.game.canvas.style.cursor = "";
                        }
                    };
                    return [
                        m(".hr"),
                        m(".two-col", [
                            m("div", RES[r].name()),
                            m("div", nf(getInputAmount(entity, r) * entity.tickSec)),
                        ]),
                        ifTrue(factoryMiningDeposit === r, () => {
                            return m(".blue.text-s", t("FactoryMiningBanner", { resource: RES[r].name() }));
                        }),
                        m(".two-col", [
                            m(
                                ".pointer",
                                {
                                    onclick: () => G.world.highlightBuildings((v) => getOutput(v.entity)[r] > 0),
                                },
                                notEnoughResource
                                    ? m(
                                          ".text-s.red",
                                          t("ConsiderIncreaseProduction", {
                                              resource: RES[r].name(),
                                          })
                                      )
                                    : m(
                                          ".text-s.text-desc",
                                          t("HighlightOutput", {
                                              type: RES[r].name(),
                                          })
                                      )
                            ),
                            m(
                                "div",
                                m(
                                    ".text-s.text-desc",
                                    t("FuelCostNumber", {
                                        cost: nf(-getOrSet(fuelCosts, r, -0)),
                                        fuel: RES[D.fuelResType].name(),
                                    })
                                )
                            ),
                        ]),
                        ifTrue(hasDLC(DLC[1]), () => {
                            return [
                                m(".hr.dashed"),
                                entity.inputOverride[r]
                                    ? m(".row.text-s.uppercase.banner", [
                                          m(
                                              ".pointer",
                                              {
                                                  onclick: () =>
                                                      G.world.highlightBuildings(
                                                          (v) => v.entity.grid === entity.inputOverride[r],
                                                          []
                                                      ),
                                              },
                                              t("BuildingSourceManual")
                                          ),
                                          ifTrue(visual.manualSourceFallback[r], () => {
                                              return m(
                                                  ".red.ml5",
                                                  { title: t("BuildingSourceFallbackMarkerDesc") },
                                                  t("BuildingSourceFallbackMarker")
                                              );
                                          }),
                                          m(".f1"),
                                          m(
                                              ".blue.pointer",
                                              {
                                                  onclick: () => {
                                                      delete entity.inputOverride[r];
                                                  },
                                              },
                                              t("BuildingSourceReset")
                                          ),
                                      ])
                                    : m(".row.text-s.uppercase", [
                                          m(".f1", t("BuildingSourceAuto")),
                                          m(
                                              ".blue.pointer",
                                              {
                                                  onclick: selectRoute,
                                              },
                                              selecting === r
                                                  ? t("BuildingSourceSelecting")
                                                  : t("BuildingSourceSetOverride")
                                          ),
                                      ]),
                            ];
                        }),
                    ];
                }),
            ]);
        },
    };
}
