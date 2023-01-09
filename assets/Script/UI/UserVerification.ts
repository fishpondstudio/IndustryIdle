import { checkVerification, forceRestoreTradeToken, G } from "../General/GameData";
import { t } from "../General/i18n";
import { NativeSdk } from "../General/NativeSdk";
import { VerificationResult } from "./ImportExport";
import { iconB, uiHotkey } from "./UIHelper";

export function UserVerification(): m.Comp {
    let result: VerificationResult = null;
    return {
        view: () => {
            const content = [];
            if (result) {
                if (result.authenticated) {
                    content.push(m(".hr.dashed"));
                    content.push(
                        m(".two-col.green", [
                            m(".text-m", t("AccountAuthenticated")),
                            m(".ml20", iconB("check_circle", 16)),
                        ])
                    );
                    if (result.trusted) {
                        content.push(m(".hr.dashed"));
                        content.push(
                            m(".two-col.green", [
                                m(".text-m", t("AccountTrusted")),
                                m(".ml20", iconB("check_circle", 16)),
                            ])
                        );
                    } else {
                        content.push(m(".hr.dashed"));
                        content.push(
                            m(".two-col.red", [
                                m("div", [
                                    m(".text-m", t("AccountLimited")),
                                    m(".text-desc.text-s", t("AccountLimitedDescV2")),
                                    m(
                                        ".blue.text-s.uppercase.mt5.pointer",
                                        {
                                            onclick: async () => {
                                                G.audio.playClick();
                                                NativeSdk.openUrl("https://industryidle.com/faq.html");
                                            },
                                        },
                                        t("AccountLimitedActionV2")
                                    ),
                                ]),
                                m(".ml20", iconB("cancel", 16)),
                            ])
                        );
                    }
                    if (result.passAntiCheat) {
                        content.push(m(".hr.dashed"));
                        content.push(
                            m(".two-col.green", [
                                m(".text-m", t("AntiCheatPass")),
                                m(".ml20", iconB("check_circle", 16)),
                            ])
                        );
                    } else {
                        content.push(m(".hr.dashed"));
                        content.push(
                            m(".two-col.red", [m(".text-m", t("AntiCheatFail")), m(".ml20", iconB("cancel", 16))])
                        );
                    }
                    if (result.rightToTrade) {
                        content.push(m(".hr.dashed"));
                        content.push(
                            m(".two-col.green", [
                                m(".text-m", t("RightToTradeValid")),
                                m(".ml20", iconB("check_circle", 16)),
                            ])
                        );
                    } else {
                        content.push(m(".hr.dashed"));
                        content.push(
                            m(".two-col.red", [
                                m("div", [
                                    m(".text-m", t("RightToTradeInvalid")),
                                    m(".text-desc.text-s", t("RightToTradeInvalidDesc")),
                                    m(
                                        ".blue.text-s.uppercase.mt5.pointer",
                                        {
                                            onclick: async () => {
                                                G.audio.playClick();
                                                result = null;
                                                await forceRestoreTradeToken();
                                            },
                                        },
                                        t("ForceRestoreRightToTrade", { cooldown: result.rightToTradeCooldown })
                                    ),
                                ]),
                                m(".ml20", iconB("cancel", 16)),
                            ])
                        );
                    }
                } else {
                    content.push(m(".hr.dashed"));
                    content.push(
                        m(".two-col.red.text-m", [
                            m("div", t("AccountNotAuthenticated")),
                            m(".ml20", iconB("cancel", 16)),
                        ])
                    );
                }
            }
            return [
                m(
                    ".two-col.pointer",
                    {
                        "data-shortcut": "1-false-false-false",
                        onclick: async () => {
                            G.audio.playClick();
                            const resp = await checkVerification();
                            if (resp.status !== 200) {
                                result = {
                                    authenticated: false,
                                    rightToTrade: false,
                                    rightToTradeCooldown: 0,
                                    trusted: false,
                                    passAntiCheat: false,
                                };
                            } else {
                                result = await resp.json();
                            }
                            m.redraw();
                        },
                    },
                    [
                        m("div", [
                            uiHotkey(
                                {key: "1", ctrlKey: false, shiftKey: false, altKey: false}, 
                                "", 
                                " ",
                                D.persisted.hideHotkeySubmenuLabels
                            ), 
                            t("AccountVerification")
                        ]), 
                        m(".mv-10.ml20.blue", iconB("arrow_forward"))
                    ]
                ),
                content,
            ];
        },
    };
}
