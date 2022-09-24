import { COLORS } from "../CoreGame/ColorThemes";
import { BLD } from "../CoreGame/Logic/Logic";
import { D, G, saveData } from "../General/GameData";
import { camelCaseToDash, forEach, ifTrue, mapOf, sizeOf } from "../General/Helper";
import { t } from "../General/i18n";
import { leftOrRight, reloadGame, uiHeaderActionBack } from "./UIHelper";

export function ColorThemeEditorPage() {
    const overrides: Record<string, string> = JSON.parse(JSON.stringify(D.persisted.colorThemeOverrides));
    return {
        view: () => {
            const color = COLORS[D.persisted.colorTheme];
            return m("div.modal", { class: leftOrRight() }, [
                uiHeaderActionBack(t("ColorThemeEditor"), () => G.world.routeTo(G.headquarter.grid)),
                m(".scrollable", [
                    m(".box", [
                        m(".title", m("div", color.name)),
                        Object.keys(color)
                            .filter((k) => color[k] instanceof cc.Color)
                            .map((k) => {
                                return [
                                    m(".hr"),
                                    m(".row.monospace-font.text-m", [
                                        m("div", [
                                            m("div", camelCaseToDash(k)),
                                            overrides[k]
                                                ? m(
                                                      ".pointer.red.text-s.mt5",
                                                      {
                                                          onclick: () => {
                                                              delete overrides[k];
                                                          },
                                                      },
                                                      t("ColorThemeEditorReset")
                                                  )
                                                : null,
                                        ]),
                                        m(".f1"),
                                        m("input.color-picker", {
                                            type: "color",
                                            oninput: (e) => {
                                                overrides[k] = e.target.value;
                                            },
                                            value: overrides[k] || (color[k] as cc.Color).toCSS("#rrggbb"),
                                        }),
                                    ]),
                                ];
                            }),
                        m(".action", [
                            m(
                                ".red",
                                {
                                    onclick: async () => {
                                        D.persisted.colorThemeOverrides = {};
                                        await saveData();
                                        reloadGame();
                                    },
                                },
                                t("ColorThemeEditorResetAll")
                            ),
                            m(
                                "div",
                                {
                                    onclick: async () => {
                                        forEach(overrides, (k, v) => {
                                            if (/^#([0-9A-F]{3}){1,2}$/i.test(v) && color[k] instanceof cc.Color) {
                                                D.persisted.colorThemeOverrides[k] = v;
                                            } else {
                                                delete D.persisted.colorThemeOverrides[k];
                                            }
                                        });
                                        await saveData();
                                        reloadGame();
                                    },
                                },
                                t("ColorThemeEditorSave")
                            ),
                        ]),
                    ]),
                    ifTrue(sizeOf(D.persisted.buildingColors) > 0, () =>
                        m(".box", [
                            m(".title", t("BuildingCustomColor")),
                            mapOf(D.persisted.buildingColors, (k, v) => {
                                return [
                                    m(".hr"),
                                    m(".row.monospace-font.text-m", [
                                        m("div", [m("div", BLD[k].name())]),
                                        m(".f1"),
                                        m("input.color-picker", {
                                            type: "color",
                                            oninput: (e) => {
                                                D.persisted.buildingColors[k] = e.target.value;
                                            },
                                            value: v,
                                        }),
                                    ]),
                                ];
                            }),
                            m(
                                ".action",
                                m(
                                    ".blue",
                                    {
                                        onclick: async () => {
                                            D.persisted.buildingColors = {};
                                            await saveData();
                                        },
                                    },
                                    t("ColorThemeEditorResetAll")
                                )
                            ),
                        ])
                    ),
                ]),
            ]);
        },
    };
}
