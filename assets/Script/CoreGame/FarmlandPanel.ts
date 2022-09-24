import { t } from "../General/i18n";
import { iconB } from "../UI/UIHelper";
import { MultipleRecipePanel } from "./Buildings/MultipleRecipePanel";
import { FarmlandEntity } from "./Logic/Entity";
import { isBuildingLevelTooHigh, isFarmlandAlwaysWork, isStableWaterTile } from "./Logic/Logic";

export function FarmlandPanel(): m.Comp<{ entity: FarmlandEntity }> {
    return {
        view: (vnode) => {
            const entity = vnode.attrs.entity;
            let banner: m.Children = null;
            if (isBuildingLevelTooHigh(vnode.attrs.entity)) {
                banner = m(".box.banner.text-m", t("WaterEntityLevelTooHighDesc"));
            } else if (!isFarmlandAlwaysWork()) {
                banner = m(".box.banner.blue.text-m", t("FarmlandProductionDesc"));
            }
            return [
                banner,
                m(MultipleRecipePanel, { entity: entity }),
                m(".box", [
                    m(".two-col", [
                        m("div", [
                            m("div", t("FarmlandOfflineFarming")),
                            m(".text-s.text-desc", t("FarmlandOfflineFarmingDesc")),
                        ]),
                        m(
                            "div",
                            isStableWaterTile(entity.grid)
                                ? iconB("check_circle", 24, 0, {}, { class: "green" })
                                : iconB("cancel", 24, 0, {}, { class: "red" })
                        ),
                    ]),
                ]),
            ];
        },
    };
}
