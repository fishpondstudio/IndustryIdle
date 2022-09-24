import { stringToGrid } from "../CoreGame/GridHelper";
import { BLD, canTransport, getFuelCostBase, getFuelTypes, getResDiff, RES } from "../CoreGame/Logic/Logic";
import { D, G, ResourceNode, T } from "../General/GameData";
import { forEach, formatHMS, ifTrue, keysOf, nf } from "../General/Helper";
import { t } from "../General/i18n";
import { CrazyGameAdBanner } from "./CrazyGameAdBanner";
import { makeSparkline, setUPlotData } from "./StatPage";
import { iconB, leftOrRight, uiHeaderRoute } from "./UIHelper";

export function LogisticsDepartmentPage(): m.Comp {
    let dots: Record<string, ResourceNode>;
    let fuelSparkline: uPlot;
    let fuelStorageSparkline: uPlot;

    function updateChart() {
        setUPlotData(fuelSparkline, T.diffTimeSeries[D.fuelResType]);
        setUPlotData(fuelStorageSparkline, T.timeSeries[D.fuelResType]);
    }

    return {
        oninit: () => {
            dots = {};
            forEach(T.dots, (_, v) => {
                const key = v.fromXy + "_" + v.toXy;
                dots[key] = v;
            });
        },
        oncreate: (vnode) => {
            fuelSparkline = makeSparkline(vnode.dom.querySelector(".fuel-sparkline"), 50, [
                { stroke: "#e84393", fill: "#fd79a8" },
            ]);
            fuelStorageSparkline = makeSparkline(vnode.dom.querySelector(".fuel-storage-sparkline"), 50, [
                { stroke: "#00b894", fill: "#55efc4" },
            ]);
            updateChart();
        },
        onupdate: () => {
            updateChart();
        },
        onremove: () => {
            fuelSparkline?.destroy();
            fuelStorageSparkline?.destroy();
        },
        view: () => {
            const fuelDiff = getResDiff(D.fuelResType);
            return m("div.modal", { class: leftOrRight() }, [
                uiHeaderRoute(t("LogisticsDepartment"), "/main"),
                m("div.scrollable", [
                    m(CrazyGameAdBanner),
                    m(".box", [
                        m(".title.two-col", [
                            m("div", t("Transportation")),
                            m(
                                ".red",
                                fuelDiff < 0
                                    ? t("RunOutIn", {
                                          time: formatHMS((1000 * T.res[D.fuelResType]) / -fuelDiff),
                                      })
                                    : null
                            ),
                        ]),
                        m(".hr"),
                        m(".two-col", [
                            m("div", t("FuelType")),
                            m(
                                ".ml20",
                                m(
                                    "select.text-m",
                                    {
                                        onchange: (e) => {
                                            D.fuelResType = e.target.value;
                                        },
                                    },
                                    getFuelTypes().map((o) =>
                                        m(
                                            "option",
                                            {
                                                key: o,
                                                value: o,
                                                selected: D.fuelResType === o,
                                            },
                                            RES[o].name()
                                        )
                                    )
                                )
                            ),
                        ]),
                        ifTrue(D.fuelResType === "Bat", () => [m(".hr"), m(".banner.text-m", t("BatteryFuelDesc"))]),
                        m(".hr"),
                        m(".two-col", [m("div", t("FuelEconomy")), m(".ml20", `${nf(getFuelCostBase())}/km`)]),
                        m(".hr"),
                        m(".fuel-storage-sparkline.mh-10"),
                        m(".hr"),
                        m(".two-col", [
                            m(
                                "div",
                                t("FuelInStorage", {
                                    fuel: RES[D.fuelResType].name(),
                                })
                            ),
                            m(".ml20", nf(T.res[D.fuelResType])),
                        ]),
                        m(".hr"),
                        m(".fuel-sparkline.mh-10"),
                        m(".hr"),
                        m(".row.text-center", [
                            m(".f1", [
                                m("div", { class: fuelDiff >= 0 ? "green" : "red" }, nf(fuelDiff)),
                                m(".text-s.text-desc", t("Surplus")),
                            ]),
                            m(".f1", [
                                m("div", `${nf(fuelDiff + T.current.fuelCost)}/s`),
                                m(".text-s.text-desc", t("Production")),
                            ]),
                            m(".f1", [
                                m(
                                    "div",
                                    t("PerSecond", {
                                        time: nf(T.current.fuelCost),
                                    })
                                ),
                                m(".text-s.text-desc", t("Consumption")),
                            ]),
                        ]),
                    ]),
                    m(".box", [
                        m(".title", t("Top20FuelCost")),
                        Object.keys(dots)
                            .sort((a, b) => dots[b].fuelCost - dots[a].fuelCost)
                            .filter((v, i) => i < 20)
                            .map((k, i) => {
                                const d = dots[k];
                                const from = D.buildings[d.fromXy];
                                const to = D.buildings[d.toXy];
                                if (!from || !to) {
                                    return [];
                                }
                                return [
                                    m(".hr"),
                                    m(".row", [
                                        m(
                                            ".pointer",
                                            {
                                                style: { flex: 1 },
                                                onclick: () => G.world.locate(stringToGrid(d.fromXy)),
                                            },
                                            [
                                                m(".text-desc.text-s", "🔍 " + t("From")),
                                                m("div", BLD[from.type].name()),
                                                m(".text-s.blue", `${t("FuelCost")}: ${nf(d.fuelCost)}`),
                                            ]
                                        ),
                                        m(".text-desc", iconB("east")),
                                        m(
                                            ".pointer",
                                            {
                                                style: {
                                                    flex: 1,
                                                    textAlign: "right",
                                                },
                                                onclick: () => G.world.locate(stringToGrid(d.toXy)),
                                            },
                                            [
                                                m(".text-desc.text-s", "🔍 " + t("To")),
                                                m("div", BLD[to.type].name()),
                                                m(".text-s.blue", `${t("TransportTime")}: ${nf(d.totalTime)}s`),
                                            ]
                                        ),
                                    ]),
                                ];
                            }),
                    ]),
                    m(".box", [
                        m(".title", t("SpecialTransportCost")),
                        keysOf(RES)
                            .filter((r) => canTransport(r) && RES[r].fuelCost !== 1 && RES[r].fuelCost !== 0)
                            .map((r) => {
                                return [
                                    m(".hr"),
                                    m(".two-col.text-m", [m("div", RES[r].name()), m("div", ["x", RES[r].fuelCost])]),
                                ];
                            }),
                        m(".hr"),
                        m(".title", t("FreeTransportCost")),
                        m(".hr"),
                        m(
                            ".text-m",
                            keysOf(RES)
                                .filter((r) => canTransport(r) && RES[r].fuelCost === 0)
                                .map((r) => RES[r].name())
                                .join(", ")
                        ),
                    ]),
                ]),
            ]);
        },
    };
}
