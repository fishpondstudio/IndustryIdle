import { G, T } from "../General/GameData";
import { formatPercent, ifTrue } from "../General/Helper";
import { t } from "../General/i18n";
import { stringToGrid } from "./GridHelper";
import { Entity } from "./Logic/Entity";
import { BLD } from "./Logic/Logic";
import { getBoostableBuildings, getResourceBoosterPercentage } from "./Logic/Production";

export function ResourceBoosterPanel(): m.Component<{ entity: Entity }> {
    return {
        view: (vnode) => {
            const entity = vnode.attrs.entity;
            const percentage = getResourceBoosterPercentage(entity);
            const visual = G.world.buildingVisuals[entity.grid];
            if (!visual) {
                return null;
            }
            const boostableBuildings = getBoostableBuildings(stringToGrid(entity.grid));
            return [
                m(".box", [
                    m(".title", t("ResourceBoosterBuildings")),
                    boostableBuildings.map((mine) => [
                        m(".hr"),
                        m(
                            ".two-col.pointer",
                            {
                                onclick: () => {
                                    G.audio.playClick();
                                    G.world.highlightBuildings((v) => v.entity.grid === mine.grid);
                                },
                            },
                            [
                                m("div", [
                                    m("div", BLD[mine.type].name()),
                                    m(".text-s.text-desc", "🔍 " + t("LevelN", { level: mine.level })),
                                ]),
                                m("div", [
                                    visual.isWorking
                                        ? m(".green", "+" + formatPercent(percentage))
                                        : m(".text-desc", "0%"),
                                ]),
                            ]
                        ),
                    ]),
                    ifTrue(boostableBuildings.length <= 0, () => [
                        m(".hr"),
                        m(".text-desc.text-m", t("ResourceBoosterNotWorking")),
                    ]),
                ]),
                m(
                    ".box.banner.text-m.blue",
                    t("ResourceBoosterBannerDescV2", {
                        number: T.buildingCount.ResourceBooster,
                    })
                ),
            ];
        },
    };
}
