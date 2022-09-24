import { Entity } from "../CoreGame/Logic/Entity";
import {
    BLD,
    buildingContainsWord,
    getUnlockRequirement,
    RES,
    tryDeductResources,
    unlockableBuildings,
    unlockResearchPoint,
} from "../CoreGame/Logic/Logic";
import { Resources } from "../CoreGame/ResourceDefinitions";
import { D, dlcLabel, G, T } from "../General/GameData";
import { forEach, ifTrue, keysOf } from "../General/Helper";
import { t } from "../General/i18n";
import { CrazyGameAdBanner } from "./CrazyGameAdBanner";
import {
    iconB,
    leftOrRight,
    progressBarWithLabel,
    uiBuildingBasicInfo,
    uiBuildingInputOutput,
    uiHeaderRoute,
} from "./UIHelper";
import { showToast } from "./UISystem";

export function ResearchPage(): m.Comp<{ entity: Entity }> {
    let keyword = "";
    return {
        view: (vnode) => {
            const unlockable = unlockableBuildings();
            const entity = vnode.attrs.entity;
            return m("div.modal", { class: leftOrRight() }, [
                uiHeaderRoute(t("ResearchLab"), "/main"),
                m("div.scrollable", [
                    m(CrazyGameAdBanner),
                    uiBuildingBasicInfo(entity),
                    m(".box.row", [
                        iconB("search", 24, 10, { margin: "-10px 5px -10px 0" }, { class: "text-desc" }),
                        m("input.f1", {
                            type: "text",
                            placeholder: t("BuildSearchPlaceholder"),
                            oninput: (e) => {
                                keyword = e.target.value;
                            },
                        }),
                    ]),
                    unlockable
                        .filter((b) => buildingContainsWord(b, keyword))
                        .map((b) => {
                            const building = BLD[b];
                            const rp = unlockResearchPoint(b);
                            const hasEnoughRP = T.res.RP >= rp;
                            const hasEnoughResources = keysOf(building.staticInput).every(
                                (r) => T.usableRes[r] >= building.staticInput[r] * getUnlockRequirement(b)
                            );
                            let action: m.Children = null;
                            if (hasEnoughRP && hasEnoughResources) {
                                action = m(
                                    ".action",
                                    m(
                                        "div",
                                        {
                                            onclick: () => {
                                                const resources: Partial<Record<keyof Resources, number>> = {};
                                                forEach(building.staticInput, (k, v) => {
                                                    resources[k] = v * getUnlockRequirement(b);
                                                });
                                                resources.RP = rp;
                                                if (tryDeductResources(resources)) {
                                                    G.audio.playClick();
                                                    D.unlockedBuildings[b] = true;
                                                    showToast(
                                                        t("BuildingUnlocked", {
                                                            building: building.name(),
                                                        })
                                                    );
                                                } else {
                                                    G.audio.playError();
                                                    showToast(t("NotEnoughResources"));
                                                }
                                            },
                                        },
                                        [
                                            iconB("lock_open", 24, 5, {
                                                marginTop: "-10px",
                                                marginBottom: "-10px",
                                            }),
                                            t("Unlock"),
                                        ]
                                    )
                                );
                            }
                            return m(".box", [
                                m(".title.two-col", [m("div", building.name()), m(".orange", dlcLabel(building.dlc))]),
                                m(".hr"),
                                m("div.research-building-info", uiBuildingInputOutput(b)),
                                m(".hr"),
                                progressBarWithLabel(RES.RP.name(), T.res.RP, rp),
                                keysOf(building.staticInput).map((res) => {
                                    const unlockRequirement = building.staticInput[res] * getUnlockRequirement(b);
                                    return [
                                        m(".hr"),
                                        progressBarWithLabel(
                                            [
                                                m("span", RES[res].name()),
                                                ifTrue(D.autoSellRes[res], () =>
                                                    m(
                                                        "span.ml5.text-desc.text-s.cursor-help",
                                                        {
                                                            title: t("AutoSellResourceWarningDesc"),
                                                        },
                                                        t("AutoSellResourceWarningShortLabel")
                                                    )
                                                ),
                                            ],
                                            T.usableRes[res],
                                            unlockRequirement
                                        ),
                                    ];
                                }),
                                action,
                            ]);
                        }),
                ]),
            ]);
        },
    };
}
