import { Buildings, ResourceNumberMap } from "../CoreGame/Buildings/BuildingDefinitions";
import { getCurrentColor } from "../CoreGame/ColorThemes";
import { stringToGrid } from "../CoreGame/GridHelper";
import {
    BLD,
    buildingContainsWord,
    canBuild,
    canPlaceOnTile,
    getBuildingCount,
    getBuildingPermit,
    getBuildingPermitCost,
    getCash,
    getCostForBuilding,
    isAvailable,
    isMine,
    RES,
    trySpendCash,
    warnBeforeBuild,
} from "../CoreGame/Logic/Logic";
import {
    getAdjacentGroupByType,
    getMineOutput,
    getTileModifier,
    isPowerBankWorking,
} from "../CoreGame/Logic/Production";
import { isPolicyActive } from "../CoreGame/Logic/SelfContained";
import { Resources } from "../CoreGame/ResourceDefinitions";
import { D, dlcLabel, G, hasDLC, T } from "../General/GameData";
import { forEach, formatPercent, hasValue, ifTrue, keysOf, nf, safeGet } from "../General/Helper";
import { t } from "../General/i18n";
import { NativeSdk } from "../General/NativeSdk";
import { shortcut } from "./Shortcut";
import { iconB, leftOrRight, uiBoxToggleContent, uiBuildingInputOutput, uiHeaderRoute } from "./UIHelper";
import { routeTo, showToast } from "./UISystem";

let lastBuilt: keyof Buildings;

let onlyShowPositiveTiles = false;

export function BuildPage(): m.Comp<{ xy: string }> {
    let xy: string;
    let selected: keyof Buildings = null;
    let keyword: string;
    let pathCheckingStatus: "checking" | "valid" | "invalid" | "blocked" = "checking";
    return {
        onremove: () => {
            G.world.clearOverlay();
        },
        view: (vnode) => {
            if (xy !== vnode.attrs.xy) {
                xy = vnode.attrs.xy;
                pathCheckingStatus = "checking";
                if (!G.world.waveManager.pathTileCache[xy]) {
                    pathCheckingStatus = "valid";
                } else if (T.currentWaveStatus === "inProgress") {
                    pathCheckingStatus = "blocked";
                } else {
                    G.world.waveManager.recalculateWormholePath({ [xy]: 1 }).then((results) => {
                        if (results.every((result) => result.path.length > 0)) {
                            pathCheckingStatus = "valid";
                        } else {
                            pathCheckingStatus = "invalid";
                        }
                        m.redraw();
                    });
                }
            } else {
                xy = vnode.attrs.xy;
            }

            if (pathCheckingStatus === "checking") {
                return m("div.modal", { class: leftOrRight() }, [
                    uiHeaderRoute(t("Build"), "/main"),
                    m(".sep20"),
                    m(".loader"),
                ]);
            }

            if (pathCheckingStatus === "invalid") {
                return m("div.modal", { class: leftOrRight() }, [
                    uiHeaderRoute(t("Build"), "/main"),
                    m(".box.text-desc.text-center", [
                        m(".sep10"),
                        iconB("remove_circle_outline", 50),
                        m(".sep10"),
                        t("PathBlocked"),
                        m(".sep20"),
                    ]),
                ]);
            }

            if (pathCheckingStatus === "blocked") {
                return m("div.modal", { class: leftOrRight() }, [
                    uiHeaderRoute(t("Build"), "/main"),
                    m(".box.text-desc.text-center", [
                        m(".sep10"),
                        iconB("error_outline", 50),
                        m(".sep10"),
                        t("PathTemporarilyBlocked"),
                        m(".sep20"),
                    ]),
                ]);
            }

            const grid = stringToGrid(xy);

            const deposit = G.world.depositNodes[xy];
            let depositNode = m("div");

            let res: keyof Resources;
            if (deposit) {
                res = deposit.name as keyof Resources;
                const highlightAll = () => {
                    G.world.highlightBuildings((v) => getMineOutput(v.entity.type) === res, [res]);
                };
                depositNode = m(".box", [
                    m(
                        ".two-col.blue.pointer",
                        {
                            onclick: highlightAll,
                            "data-shortcut": "a",
                        },
                        [
                            m("div", [shortcut("A", "", " "), t("HighlightAll", { type: RES[res].name() })]),
                            m(".ml20", "🔍"),
                        ]
                    ),
                ]);
            }

            const deficit = cc.misc.clampf(getBuildingCount() + 1 - getBuildingPermit(), 0, Infinity);
            const buildingPermitCost = getBuildingPermitCost(deficit);
            const buildingCosts: ResourceNumberMap = {};
            forEach(BLD, (b) => {
                if (canBuild(b)) {
                    buildingCosts[b] = getCostForBuilding(b, 1);
                }
            });
            const adjacentBuildings = getAdjacentGroupByType(grid);
            return m("div.modal", { class: leftOrRight() }, [
                uiHeaderRoute(t("Build"), "/main"),
                m("div.scrollable", [
                    ifTrue(D.isFirstSession, () =>
                        m(
                            ".box.banner.blue.text-m.pointer",
                            {
                                onclick: () => {
                                    NativeSdk.openUrl(
                                        "https://steamcommunity.com/sharedfiles/filedetails/?id=2450367986"
                                    );
                                },
                            },
                            t("FirstTimeReadGuide")
                        )
                    ),
                    depositNode,
                    m(".box", [
                        m(
                            "div",
                            m("input", {
                                type: "text",
                                placeholder: t("BuildSearchPlaceholder"),
                                oninput: (e: InputEvent) => {
                                    keyword = (e.target as HTMLInputElement).value;
                                },
                            })
                        ),
                        m(".hr"),
                        uiBoxToggleContent(
                            m(
                                ".text-s.uppercase",
                                { title: t("OnlyShowPositiveModifiersHint") },
                                t("OnlyShowPositiveModifiers")
                            ),
                            onlyShowPositiveTiles,
                            () => {
                                onlyShowPositiveTiles = !onlyShowPositiveTiles;
                                if (selected !== null) {
                                    showTileModifiers(selected);
                                }
                            },
                            { style: { margin: "-10px 0" } },
                            24
                        ),
                        keysOf(BLD)
                            .filter(
                                (b) =>
                                    canBuild(b) &&
                                    canPlaceOnTile(b, xy) &&
                                    hasDLC(BLD[b].dlc) &&
                                    buildingContainsWord(b, keyword) &&
                                    isAvailable(BLD[b])
                            )
                            .sort((a, b) => {
                                if (isMine(a) && !isMine(b)) {
                                    return -1;
                                }
                                if (isMine(b) && !isMine(a)) {
                                    return 1;
                                }
                                if (lastBuilt === a) {
                                    return -1;
                                }
                                if (lastBuilt === b) {
                                    return 1;
                                }
                                if (adjacentBuildings[a] && !adjacentBuildings[b]) {
                                    return -1;
                                }
                                if (adjacentBuildings[b] && !adjacentBuildings[a]) {
                                    return 1;
                                }
                                if (D.unlockedBuildings[a] && !D.unlockedBuildings[b]) {
                                    return -1;
                                }
                                if (D.unlockedBuildings[b] && !D.unlockedBuildings[a]) {
                                    return 1;
                                }
                                if (buildingCosts[a] > buildingCosts[b]) {
                                    return 1;
                                }
                                if (buildingCosts[a] < buildingCosts[b]) {
                                    return -1;
                                }
                                if (a > b) {
                                    return 1;
                                }
                                return -1;
                            })
                            .map((c) => {
                                const unlocked = D.unlockedBuildings[c];
                                const buildingCost = buildingCosts[c];
                                const totalCost = buildingCost + buildingPermitCost;
                                const mine = isMine(c) || c === "GeothermalPowerPlant";
                                const powerBank = c === "PowerBank" && isPowerBankWorking(grid);
                                const highlight = mine || powerBank || c === lastBuilt || adjacentBuildings[c];
                                const tileModifier = getTileModifier(xy, c);
                                const shortcutKey = mine ? 1 : lastBuilt === c ? 2 : null;
                                const build = () => {
                                    if (T.currentWaveStatus === "inProgress" && G.world.waveManager.pathTileCache[xy]) {
                                        G.audio.playError();
                                        showToast(t("WaveInProgressBuildRemoveDisabled"));
                                        return;
                                    }
                                    if (!isPolicyActive("Blueprint") && !unlocked) {
                                        G.audio.playError();
                                        showToast(t("BuildingLocked"));
                                        return;
                                    }
                                    if (D.buildings[xy] || D.buildingsToConstruct[xy]) {
                                        G.audio.playError();
                                        return;
                                    }
                                    warnBeforeBuild(c, xy, () => {
                                        if (isPolicyActive("Blueprint")) {
                                            G.world.addBuilding(xy, c, "unpaid");
                                            lastBuilt = c;
                                            routeTo("/main");
                                            return;
                                        }
                                        if (!trySpendCash(totalCost)) {
                                            G.audio.playError();
                                            showToast(t("NotEnoughCash"));
                                            return;
                                        }
                                        G.world.addBuilding(xy, c, "queueing");
                                        G.world.waveManager.redrawWormholePath();
                                        lastBuilt = c;
                                        D.buildingPermit += deficit;
                                        routeTo("/main");
                                    });
                                };
                                return m("div", { key: c }, [
                                    m(".hr"),
                                    m(".row", [
                                        m(
                                            ".pointer",
                                            {
                                                onclick: () => {
                                                    if (isMine(c) || c === "GeothermalPowerPlant") {
                                                        G.audio.playError();
                                                        showToast(
                                                            t("MineOverlayWarning", {
                                                                building: BLD[c].name(),
                                                            })
                                                        );
                                                        return;
                                                    }
                                                    G.audio.playClick();
                                                    if (selected === c) {
                                                        selected = null;
                                                        G.world.clearOverlay();
                                                        return;
                                                    }
                                                    selected = c;
                                                    showTileModifiers(c);
                                                },
                                            },
                                            selected === c
                                                ? iconB("check_box", 18, 0, {}, { class: "blue" })
                                                : iconB("check_box_outline_blank", 18, 0, {}, { class: "text-desc" })
                                        ),
                                        m(".building-name-sep"),
                                        m(
                                            ".f1.pointer",
                                            {
                                                onclick: build,
                                                "data-shortcut": shortcutKey,
                                            },
                                            [
                                                m(
                                                    "div",
                                                    {
                                                        class: highlight ? "orange" : "",
                                                    },
                                                    [
                                                        shortcutKey ? shortcut(shortcutKey, "", " ") : "",
                                                        BLD[c].name(),
                                                        m(
                                                            "span.text-m.ml5",
                                                            {
                                                                title: t("TileModifier"),
                                                                class: tileModifier >= 0 ? "green" : "red",
                                                            },
                                                            formatPercent(tileModifier)
                                                        ),
                                                        m(
                                                            "span.text-desc.text-m.ml5",
                                                            {
                                                                title: t("NumberOfBuildings"),
                                                            },
                                                            ["(", safeGet(T.buildingCount, c, 0), ")"]
                                                        ),
                                                        highlight ? " ⭐ " : "",
                                                    ]
                                                ),
                                                m(".text-s.orange", [
                                                    ifTrue(hasValue(BLD[c].dlc), () =>
                                                        m("span.mr5", dlcLabel(BLD[c].dlc))
                                                    ),
                                                    ifTrue(hasValue(BLD[c].available), () =>
                                                        m("span.mr5", t("MapExclusive"))
                                                    ),
                                                ]),
                                                uiBuildingInputOutput(c),
                                            ]
                                        ),
                                        ifTrue(!unlocked && !isPolicyActive("Blueprint"), () =>
                                            m(".text-desc.ml10", iconB("lock"))
                                        ),
                                        ifTrue(unlocked && !isPolicyActive("Blueprint"), () =>
                                            m(
                                                ".pointer.text-right.ml10",
                                                {
                                                    onclick: build,
                                                    class: getCash() >= totalCost ? "blue" : "text-desc",
                                                },
                                                [
                                                    m("div", `$${nf(buildingCost)}`),
                                                    buildingPermitCost > 0
                                                        ? m(
                                                              ".text-desc.text-s",
                                                              {
                                                                  title: t("BuildingPermit") + ` x${deficit}`,
                                                              },
                                                              `+$${nf(buildingPermitCost)}`
                                                          )
                                                        : null,
                                                ]
                                            )
                                        ),
                                        ifTrue(isPolicyActive("Blueprint"), () =>
                                            m(
                                                ".ml10.text-center.pointer",
                                                {
                                                    onclick: build,
                                                    title: t("PlaceBlueprint"),
                                                },
                                                [
                                                    m(".blue", iconB("construction")),
                                                    m(".text-desc.text-s.uppercase", t("CostFree")),
                                                ]
                                            )
                                        ),
                                    ]),
                                ]);
                            }),
                    ]),
                ]),
            ]);
        },
    };

    function showTileModifiers(c: keyof Buildings) {
        const colorScale = chroma.scale([
            getCurrentColor().modifierOverlayMin.toHEX("#rrggbb"),
            getCurrentColor().modifierOverlayMax.toHEX("#rrggbb"),
        ]);
        G.world.forEachOverlay((xy, label) => {
            const modifier = getTileModifier(xy, c);
            let showTileModifier = (onlyShowPositiveTiles && modifier > 0) || !onlyShowPositiveTiles;

            if (showTileModifier) {
                let maxVal = isPolicyActive("AdjacentBonusSquare") ? 0.15 : 0.25;
                if (isPolicyActive("DoubleTileModifier")) {
                    maxVal *= 2;
                }
                label.string = formatPercent(modifier);
                const percent = (modifier + maxVal) / 2 / maxVal;
                label.node.color = cc.color().fromHEX(colorScale(percent).hex("rgb"));
                label.node.opacity = 55 + 200 * percent;
                label.node.active = true;
            } else {
                label.node.active = false;
            }
        });
    }
}
