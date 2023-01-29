import { D,G, ScrollSensitivity, ScrollSensitivityOptions } from "../General/GameData";
import { t } from "../General/i18n";
import { leftOrRight, uiHeaderActionBack } from "./UIHelper";
import { routeTo } from "./UISystem";

export function InputSettingsPage(): m.Component {
    return {
        view: () => {
            return m("div.modal", { class: leftOrRight() }, [
                uiHeaderActionBack(t("GameSettingInput"), () => routeTo("/settings")),
                m(".scrollable", [
                    m(".box.inputsettings", [
                        m(".title", t("GameSettingInput")),
                        m(".hr"),
                        m(".two-col", [
                            m(
                                "div",
                                m("div", [
                                    m("div", t("MousewheelSensitivity")),
                                    m(".text-desc.text-s", t("MousewheelSensitivityDesc")),
                                ])
                            ),
                            m(
                                ".ml20",
                                m(
                                    "select.text-m",
                                    {
                                        onchange: async (e) => {
                                            G.audio.playClick();
                                            D.persisted.scrollSensitivity = parseFloat(e.target.value) as ScrollSensitivity;
                                        },
                                    },
                                    ScrollSensitivityOptions.map((k) =>
                                        m(
                                            "option",
                                            {
                                                key: k,
                                                value: k,
                                                selected: D.persisted.scrollSensitivity === k,
                                            },
                                            `${k}x`
                                        )
                                    )
                                )
                            ),
                        ]),
                    ]),
                ]),
            ]);
        },
    };
}