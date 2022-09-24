import { stringToGrid } from "../CoreGame/GridHelper";
import { Entity, getInput, getOutput } from "../CoreGame/Logic/Entity";
import {
    activeInputOutput,
    BLD,
    canShowStat,
    getResDiff,
    RES,
    stableInputOutput,
    visibleResources,
} from "../CoreGame/Logic/Logic";
import { getPowerBalance, getPowerBankLeft } from "../CoreGame/Logic/Production";
import { Resources } from "../CoreGame/ResourceDefinitions";
import { D, G, T } from "../General/GameData";
import { formatHMS, ifTrue, maxOf, nf, numberSign } from "../General/Helper";
import { t } from "../General/i18n";
import { CrazyGameAdBanner } from "./CrazyGameAdBanner";
import { Desktop } from "./HudPage";
import { getContainerClass, iconB, isMobile, uiBoxToggleContent, uiHeaderAction } from "./UIHelper";
import { routeTo } from "./UISystem";

let selected: keyof Resources = null;
let sortBy: "runout" | "deficit" | "storage" | "name" = "runout";
let hideResourcesNotProducing = false;
let showTheoreticalInputOutputCapacity = false;

export function StatPage(): m.Comp<{ entity: Entity; docked: boolean }> {
    let resSparkline: uPlot;
    let resDiffSparkline: uPlot;
    let powerSparkline: uPlot;

    function updateChart(dom: Element) {
        const res = dom.querySelector(".res-sparkline");
        if (res && res !== resSparkline?.ctx?.canvas?.parentElement) {
            resSparkline = makeSparkline(res, 50, [{ stroke: "#0984e3", fill: "#74b9ff" }]);
        }
        const resDiff = dom.querySelector(".res-diff-sparkline");
        if (resDiff && resDiff !== resDiffSparkline?.ctx?.canvas?.parentElement) {
            resDiffSparkline = makeSparkline(resDiff, 50, [{ stroke: "#00cec9", fill: "#81ecec" }]);
        }
        if (selected) {
            setUPlotData(resSparkline, T.timeSeries[selected]);
            setUPlotData(resDiffSparkline, T.diffTimeSeries[selected]);
        }
        setUPlotData(powerSparkline, T.timeSeries.Power);
    }

    return {
        oncreate: (vnode) => {
            powerSparkline = makeSparkline(vnode.dom.querySelector(".power-sparkline"), 50, [
                { stroke: "#6c5ce7", fill: "#a29bfe" },
            ]);
        },

        onupdate: (vnode) => {
            updateChart(vnode.dom);
        },

        onremove: () => {
            resSparkline?.destroy();
            resDiffSparkline?.destroy();
            powerSparkline?.destroy();
        },

        view: (vnode) => {
            const totalIO = showTheoreticalInputOutputCapacity ? stableInputOutput() : activeInputOutput();
            const powerBalance = getPowerBalance();
            return m("div", { class: getContainerClass(vnode.attrs.docked) }, [
                uiHeaderAction(
                    t("StatisticsBureau"),
                    () => {
                        if (vnode.attrs.docked) {
                            Desktop.secondaryPage = null;
                        } else {
                            routeTo("/main");
                        }
                    },
                    isMobile() || vnode.attrs.docked ? null : () => (Desktop.secondaryPage = StatPage())
                ),
                m("div.scrollable", [
                    m(CrazyGameAdBanner),
                    m(".box", [
                        m(".title.two-col", [
                            m("div", t("PowerGrid")),
                            m("div", { class: powerBalance > 0 ? "green" : "red" }, `${nf(powerBalance, true)}W`),
                        ]),
                        m(".hr"),
                        m(".power-sparkline.mh-10"),
                        m(".hr"),
                        m(".row.text-center", [
                            m(".f1", [
                                m("div", `${nf(T.current.powerSupply, true)}W`),
                                m(".text-s.text-desc", t("PowerSupply")),
                            ]),
                            m(".f1", [
                                m("div", `${nf(T.current.powerRequired, true)}W`),
                                m(".text-s.text-desc", t("PowerRequired")),
                            ]),
                            m(".f1", [
                                m("div", `${nf(getPowerBankLeft(), true)}W`),
                                m(".text-s.text-desc", t("PowerBankLeft")),
                            ]),
                        ]),
                    ]),
                    m(".box", [
                        m(".row.text-s.uppercase", [
                            m(".f1.mr20", t("SortBy")),
                            m(
                                ".pointer",
                                {
                                    class: sortBy === "runout" ? "blue" : "text-desc",
                                    onclick: () => (sortBy = "runout"),
                                },
                                t("SortByRunOut")
                            ),
                            m(
                                ".ml10.pointer",
                                {
                                    class: sortBy === "deficit" ? "blue" : "text-desc",
                                    onclick: () => (sortBy = "deficit"),
                                },
                                t("SortByDeficit")
                            ),
                            m(
                                ".ml10.pointer",
                                {
                                    class: sortBy === "storage" ? "blue" : "text-desc",
                                    onclick: () => (sortBy = "storage"),
                                },
                                t("SortByStorage")
                            ),
                            m(
                                ".ml10.pointer",
                                {
                                    class: sortBy === "name" ? "blue" : "text-desc",
                                    onclick: () => (sortBy = "name"),
                                },
                                t("SortByName")
                            ),
                        ]),
                        m(".hr.dashed"),
                        m(
                            ".uppercase",
                            { style: { margin: "-5px 0" } },
                            uiBoxToggleContent(
                                m(".text-s", t("HideNotProducing")),
                                hideResourcesNotProducing,
                                () => {
                                    G.audio.playClick();
                                    hideResourcesNotProducing = !hideResourcesNotProducing;
                                },
                                {},
                                24
                            )
                        ),
                        m(".hr.dashed"),
                        m(
                            ".uppercase",
                            { style: { margin: "-5px 0" } },
                            uiBoxToggleContent(
                                m(".text-s", t("ShowTheoreticalInputOutputCapacity")),
                                showTheoreticalInputOutputCapacity,
                                () => {
                                    G.audio.playClick();
                                    showTheoreticalInputOutputCapacity = !showTheoreticalInputOutputCapacity;
                                },
                                {},
                                24
                            )
                        ),
                    ]),
                    m(
                        ".data-table",
                        m("table", [
                            m("tr", [
                                m("th"),
                                m("th", t("Resources")),
                                m("th.r", t("ResourceStorage")),
                                m("th.r", ["🔍 ", t("ResourceOutput"), " - ", t("ResourceInput")]),
                                m("th"),
                            ]),
                            visibleResources()
                                .filter((r) => {
                                    if (hideResourcesNotProducing) {
                                        return r === "Cash" || totalIO[r][1] > 0;
                                    }
                                    return true;
                                })
                                .sort((a, b) => {
                                    if (sortBy === "deficit") {
                                        if (canShowStat(a) && !canShowStat(b)) {
                                            return -1;
                                        }
                                        if (!canShowStat(a) && canShowStat(b)) {
                                            return 1;
                                        }
                                        if (!canShowStat(a) && !canShowStat(b)) {
                                            return RES[a].name().localeCompare(RES[b].name());
                                        }
                                        const diff = totalIO[a][1] - totalIO[a][0] - (totalIO[b][1] - totalIO[b][0]);
                                        return diff === 0 ? RES[a].name().localeCompare(RES[b].name()) : diff;
                                    }
                                    if (sortBy === "storage") {
                                        return T.res[b] - T.res[a];
                                    }
                                    if (sortBy === "runout") {
                                        if (canShowStat(a) && !canShowStat(b)) {
                                            return -1;
                                        }
                                        if (!canShowStat(a) && canShowStat(b)) {
                                            return 1;
                                        }
                                        const deficitA = totalIO[a][1] - totalIO[a][0];
                                        const deficitB = totalIO[b][1] - totalIO[b][0];
                                        const sa = deficitA < 0 ? T.res[a] / deficitA : -Infinity;
                                        const sb = deficitB < 0 ? T.res[b] / deficitB : -Infinity;
                                        return sa !== sb ? sb - sa : RES[a].name().localeCompare(RES[b].name());
                                    }
                                    return RES[a].name().localeCompare(RES[b].name());
                                })
                                .map((k_) => {
                                    const k = k_ as keyof Resources;
                                    const diff = getResDiff(k);
                                    const deficit = totalIO[k][1] - totalIO[k][0];
                                    return [
                                        m("tr", [
                                            m(
                                                "td.pointer",
                                                {
                                                    onclick: () => {
                                                        if (selected === k) {
                                                            selected = null;
                                                        } else {
                                                            selected = k;
                                                        }
                                                    },
                                                },
                                                selected === k
                                                    ? iconB("remove_circle_outline", 18, 0, {}, { class: "blue mv-10" })
                                                    : iconB(
                                                          "add_circle_outline",
                                                          18,
                                                          0,
                                                          {},
                                                          { class: "text-desc mv-10" }
                                                      )
                                            ),
                                            m("td", [
                                                m("div", RES[k].name()),
                                                ifTrue(canShowStat(k) && deficit < 0, () =>
                                                    m(
                                                        ".text-s.red",
                                                        t("RunOutIn", {
                                                            time: formatHMS(Math.abs((1000 * T.res[k]) / deficit)),
                                                        })
                                                    )
                                                ),
                                            ]),
                                            m("td.r", [
                                                m("div", nf(T.res[k])),
                                                m(
                                                    ".text-s",
                                                    {
                                                        class: diff >= 0 ? "green" : "red",
                                                    },
                                                    [numberSign(diff), nf(Math.abs(diff))]
                                                ),
                                            ]),
                                            m("td.r", [
                                                ifTrue(canShowStat(k) && k !== D.fuelResType, () => [
                                                    m(
                                                        "div",
                                                        {
                                                            class: deficit >= 0 ? "green" : "red",
                                                        },
                                                        nf(deficit)
                                                    ),
                                                    m(".text-s", [
                                                        m(
                                                            "span.blue.pointer",
                                                            {
                                                                onclick: () =>
                                                                    G.world.highlightBuildings(
                                                                        (v) => getOutput(v.entity)[k] > 0
                                                                    ),
                                                            },
                                                            nf(totalIO[k][1])
                                                        ),
                                                        " - ",
                                                        m(
                                                            "span.blue.pointer",
                                                            {
                                                                onclick: () =>
                                                                    G.world.highlightBuildings(
                                                                        (v) => getInput(v.entity)[k] > 0
                                                                    ),
                                                            },
                                                            nf(totalIO[k][0])
                                                        ),
                                                    ]),
                                                ]),
                                                ifTrue(k === D.fuelResType, () =>
                                                    iconB(
                                                        "open_in_new",
                                                        24,
                                                        0,
                                                        {},
                                                        {
                                                            class: "blue pointer",
                                                            onclick: () => {
                                                                G.world.clearSelection();
                                                                G.world.routeTo(G.logisticsDept.grid);
                                                            },
                                                        }
                                                    )
                                                ),
                                                ifTrue(k === "RP", () =>
                                                    iconB(
                                                        "open_in_new",
                                                        24,
                                                        0,
                                                        {},
                                                        {
                                                            class: "blue pointer",
                                                            onclick: () => {
                                                                G.world.clearSelection();
                                                                G.world.routeTo(G.researchLab.grid);
                                                            },
                                                        }
                                                    )
                                                ),
                                                ifTrue(k === "PP", () =>
                                                    iconB(
                                                        "open_in_new",
                                                        24,
                                                        0,
                                                        {},
                                                        {
                                                            class: "blue pointer",
                                                            onclick: () => {
                                                                G.world.clearSelection();
                                                                G.world.routeTo(G.policyCenter.grid);
                                                            },
                                                        }
                                                    )
                                                ),
                                            ]),
                                            m(
                                                "td.r.pointer",
                                                {
                                                    onclick: () => {
                                                        if (k === "Cash") {
                                                            return;
                                                        }
                                                        if (D.hideResourcesInTopBar[k]) {
                                                            delete D.hideResourcesInTopBar[k];
                                                        } else {
                                                            D.hideResourcesInTopBar[k] = true;
                                                        }
                                                    },
                                                    title: t("ShowResourceInTopBar"),
                                                },
                                                k === "Cash"
                                                    ? null
                                                    : D.hideResourcesInTopBar[k]
                                                    ? iconB("visibility_off", 18, 0, {}, { class: "text-desc ml5" })
                                                    : iconB("visibility", 18, 0, {}, { class: "blue ml5" })
                                            ),
                                        ]),
                                        ifTrue(selected === k, () =>
                                            m(
                                                "tr",
                                                m("td", { colspan: 5 }, [
                                                    m(".two-col", [
                                                        m("div", t("ResourceStorage")),
                                                        m("div", nf(T.res[k])),
                                                    ]),
                                                    m(".hr"),
                                                    m(".res-sparkline.mh-10"),
                                                    m(".hr"),
                                                    m(".two-col", [
                                                        m("div", t("ResourceChange")),
                                                        m(
                                                            "div",
                                                            {
                                                                class: diff >= 0 ? "green" : "red",
                                                            },
                                                            [numberSign(diff), nf(Math.abs(diff))]
                                                        ),
                                                    ]),
                                                    m(".hr"),
                                                    m(".res-diff-sparkline.mh-10"),
                                                    m(".hr"),
                                                    m(".two-col", [
                                                        m("div", t("BuildingResourceBreakdown")),
                                                        m("div", nf(T.usableRes[k])),
                                                    ]),
                                                    T.resToBldCache[k].map((entity) => {
                                                        return [
                                                            m(".hr"),
                                                            m(
                                                                ".row.pointer.text-s",
                                                                {
                                                                    onclick: () => {
                                                                        G.world.locate(stringToGrid(entity.grid));
                                                                    },
                                                                },
                                                                [
                                                                    m(".mr5.black", "🔍"),
                                                                    m(".mr5", [
                                                                        BLD[entity.type].name(),
                                                                        ifTrue(!BLD[entity.type].builtin, () => [
                                                                            " (",
                                                                            t("LevelN", {
                                                                                level: entity.level,
                                                                            }),
                                                                            ")",
                                                                        ]),
                                                                    ]),
                                                                    ifTrue(entity.turnOff, () =>
                                                                        m(
                                                                            ".black",
                                                                            {
                                                                                title: t("TurnOffProduction"),
                                                                            },
                                                                            "⛔"
                                                                        )
                                                                    ),
                                                                    m(".f1"),
                                                                    m("div", nf(entity.resources[k])),
                                                                ]
                                                            ),
                                                        ];
                                                    }),
                                                ])
                                            )
                                        ),
                                    ];
                                }),
                        ])
                    ),
                    m(".box.banner.blue.text-m", t("ResourceInOutDesc")),
                ]),
            ]);
        },
    };
}

export function makeSparkline(element: Element, height: number, series: uPlot.Series[]): uPlot {
    series.unshift({});
    const width = element.clientWidth;
    const plot = new uPlot(
        {
            width,
            height,
            class: "spark",
            pxAlign: false,
            cursor: {
                show: false,
            },
            select: {
                top: 0,
                left: 0,
                width: 0,
                height: 0,
                show: false,
            },
            legend: {
                show: false,
            },
            scales: {
                x: {
                    time: false,
                },
            },
            axes: [
                {
                    show: false,
                },
                {
                    show: false,
                },
            ],
            series: series,
        },
        [[], []]
    );

    plot.ctx.canvas.style.width = width + "px";
    plot.ctx.canvas.style.height = height + "px";
    plot.ctx.canvas.style.display = "block";
    element.appendChild(plot.ctx.canvas);
    return plot;
}

export function setUPlotData(plot: uPlot, data: uPlot.AlignedData) {
    if (!plot || !data) {
        return;
    }
    plot.setData(data);
    plot.setScale("y", {
        min: 0,
        max: maxOf(data[1]),
    });
}
