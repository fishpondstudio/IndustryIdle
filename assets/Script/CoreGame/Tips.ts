import { D } from "../General/GameData";
import { t } from "../General/i18n";
export const TIPS = [
    t("Tips1"),
    t("Tips2"),
    t("Tips3"),
    t("Tips4"),
    t("Tips5"),
    t("Tips6"),
    t("Tips7"),
    t("Tips8"),
    t("Tips9"),
    t("Tips10"),
    t("Tips11"),
];

export function nextTips() {
    D.persisted.tips = cc.misc.clampf(D.persisted.tips + 1, 0, TIPS.length);
}

export function getTips() {
    const tip = TIPS[D.persisted.tips];
    if (tip) {
        return m(".box.text-m.banner.blue", ["💡 ", tip]);
    }
    return m("div");
}
