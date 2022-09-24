import { CHANGELOG } from "../CoreGame/Changelog";
import { G } from "../General/GameData";
import { t } from "../General/i18n";
import { leftOrRight, uiHeaderActionBack } from "./UIHelper";

export function PatchNotesPage(): m.Component {
    return {
        onbeforeupdate: () => false,
        view: () => {
            return m(".modal", { class: leftOrRight() }, [
                uiHeaderActionBack(t("PatchNotes"), () => G.world.routeTo(G.headquarter.grid)),
                m(".scrollable", [
                    CHANGELOG.map((v) => {
                        return m(".box", [
                            m(".title", v.version),
                            m(".hr"),
                            m(
                                ".text-m.text-desc",
                                v.content.map((c) => {
                                    return m("li", c);
                                })
                            ),
                        ]);
                    }),
                ]),
            ]);
        },
    };
}
