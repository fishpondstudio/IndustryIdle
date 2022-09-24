import { ACH, ACH_IMG } from "../CoreGame/AchievementDefinitions";
import { addPrestigeCurrency } from "../CoreGame/Logic/Logic";
import { D, G } from "../General/GameData";
import { ifTrue, keysOf } from "../General/Helper";
import { t } from "../General/i18n";
import { iconB, leftOrRight, uiHeaderActionBack } from "./UIHelper";
import { showToast } from "./UISystem";

export function AchievementsPage(): m.Component {
    return {
        view: () => {
            const achieved = D.persisted.achievements;
            return m("div.modal", { class: leftOrRight() }, [
                uiHeaderActionBack(t("Achievements"), () => G.world.routeTo(G.headquarter.grid)),
                m(".scrollable", [
                    m(".box.achievements", [
                        m(".title", t("Achievements")),
                        keysOf(ACH).map((k) => {
                            const a = ACH[k];
                            return [
                                m(".hr"),
                                m(".row", [
                                    m("img", {
                                        src: achieved[k]?.achieved ? ACH_IMG[k][0] : ACH_IMG[k][1],
                                    }),
                                    m(".f1", [
                                        m("div", a.name()),
                                        m(".text-desc.text-s", a.desc()),
                                        m(
                                            ".text-desc.text-s",
                                            t("AchievementsReward", {
                                                swiss: a.reward,
                                            })
                                        ),
                                    ]),
                                    ifTrue(achieved[k] && achieved[k].achieved && !achieved[k].claimed, () =>
                                        m(
                                            ".blue.ml20.pointer",
                                            {
                                                onclick: () => {
                                                    G.audio.playEffect(G.audio.kaching);
                                                    if (!achieved[k].claimed) {
                                                        showToast(
                                                            t("AchievementsRewardToast", {
                                                                swiss: ACH[k].reward,
                                                            })
                                                        );
                                                        addPrestigeCurrency(ACH[k].reward);
                                                    }
                                                    achieved[k].claimed = true;
                                                },
                                            },
                                            t("AchievementsClaim")
                                        )
                                    ),
                                    ifTrue(achieved[k] && achieved[k].claimed, () =>
                                        m(".green.ml20", iconB("check_circle"))
                                    ),
                                ]),
                            ];
                        }),
                    ]),
                ]),
            ]);
        },
    };
}
