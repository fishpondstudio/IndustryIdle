import { COLORS } from "../CoreGame/ColorThemes";
import {
    clearTrades,
    D,
    FontSizeScalingOptions,
    G,
    GameData,
    hasAnyDlc,
    Languages,
    PanelPositionOptions,
    PortraitPanelHeightOptions,
    ResourceMovementOptions,
    saveData,
    saveDataOverride,
    ScrollSensitivity,
    ScrollSensitivityOptions,
    syncFPSSetting,
} from "../General/GameData";
import { ifTrue, keysOf, mapOf } from "../General/Helper";
import { t } from "../General/i18n";
import { isAndroid, isIOS, isSteam, NativeSdk, steamworks } from "../General/NativeSdk";
import { leftOrRight, iconB, reloadGame, saveAndQuit, uiBoxToggle, uiHeaderActionBack, uiBoxToggleContent } from "./UIHelper";
import { hideAlert, routeTo, showAlert, showLoader, showStandby, showToast } from "./UISystem";

export function InputSettingsPage(): m.Component {
    return {
        view: () => {
            return m("div.modal", { class: leftOrRight() }, [
                uiHeaderActionBack(t("GameSettingInput"), () => routeTo("/game-settings")),
                m(".scrollable", [
                    m(".box.gamesettings", [
                        m(".title", t("GameSettingInput")),
                        ifTrue(!isIOS() && !isAndroid(), () => [
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