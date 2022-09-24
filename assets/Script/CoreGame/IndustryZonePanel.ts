import { D, G, T } from "../General/GameData";
import { formatPercent, ifTrue } from "../General/Helper";
import { t } from "../General/i18n";
import { NativeSdk } from "../General/NativeSdk";
import { iconB } from "../UI/UIHelper";
import { Entity } from "./Logic/Entity";
import { getIndustryZoneBoostAmount } from "./Logic/Production";
import { isPolicyActive } from "./Logic/SelfContained";

export function IndustryZonePanel(): m.Component<{ entity: Entity }> {
    return {
        view: (vnode) => {
            const entity = vnode.attrs.entity;
            const visual = G.world.buildingVisuals[entity.grid];
            if (!entity || !visual) {
                return null;
            }
            return [
                m(
                    ".box",
                    m(".two-col", [
                        m("div", t("IndustryZone")),
                        m(
                            "div",
                            { style: { margin: "-10px 0 -10px 10px" } },
                            T.current.industryZone[entity.grid]
                                ? iconB("check_circle", 24, 0, {}, { class: "green" })
                                : iconB("cancel", 24, 0, {}, { class: "red" })
                        ),
                    ]),
                    m(".hr"),
                    m(
                        ".two-col.pointer.blue",
                        {
                            onclick: () => {
                                NativeSdk.openUrl("https://industryidle.com/IndustryZone.png");
                            },
                        },
                        [m("div", t("IndustryZoneHelp")), iconB("help")]
                    ),
                    ifTrue(!T.current.industryZone[entity.grid], () => {
                        return [
                            m(".hr.dashed"),
                            m(
                                ".red.text-s",
                                t("IndustryZoneNotWorkingDesc", {
                                    level: entity.level,
                                })
                            ),
                        ];
                    }),
                    ifTrue(T.current.industryZone[entity.grid], () => {
                        return [
                            m(".hr"),
                            m(".two-col", [
                                m("div", [
                                    m("div", t("BuildingPermit")),
                                    m(".text-s.text-desc", t("IndustryZoneBuildingPermitDesc")),
                                ]),
                                m(".green.ml20", "+" + (T.current.industryZoneTier[entity.grid] - 2)),
                            ]),
                            m(".hr"),
                            m(".two-col", [
                                m("div", [
                                    m("div", t("IndustryZoneMaxBuildingLevel")),
                                    m(".text-s.text-desc", t("IndustryZoneMaxBuildingLevelDesc")),
                                ]),
                                m(".ml20", entity.level),
                            ]),
                            m(".hr"),
                            m(".two-col.text-m", [
                                m("div", t("IndustryZoneCapacityBoostPermanent")),
                                m(
                                    ".ml20",
                                    "+" +
                                        T.current.industryZoneTier[entity.grid] *
                                            D.persisted.industryZoneCapacityBooster
                                ),
                            ]),
                            m(".hr"),
                            m(".two-col.text-m", [
                                m("div", t("IndustryZoneCapacityBoostThisRun")),
                                m(
                                    ".ml20",
                                    "+" +
                                        T.current.industryZoneTier[entity.grid] *
                                            D.swissBoosts.industryZoneCapacityBooster
                                ),
                            ]),
                            ifTrue(isPolicyActive("IndustryZoneProductivityBoost"), () => [
                                m(".hr"),
                                m(".two-col.text-m", [
                                    m("div", t("IndustryZoneProductivityBoost")),
                                    m(".ml20", "+" + formatPercent(getIndustryZoneBoostAmount(entity))),
                                ]),
                            ]),
                        ];
                    })
                ),
            ];
        },
    };
}
