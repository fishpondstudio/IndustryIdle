import { D, G, ScrollSensitivity, ScrollSensitivityOptions } from "../General/GameData";
import { forEach, getHotkeyDef, hasValue, HOTKEY_DEFS, keysOf, ifTrue, mapOf } from "../General/Helper";
import { Shortcut } from "../General/Hotkey";
import { t } from "../General/i18n";
import { iconB, leftOrRight, uiHotkeyConfig, uiHeaderActionBack } from "./UIHelper";
import { routeTo, showToast } from "./UISystem";

export function InputSettingsPage(): m.Component {
    let currentTipIndex: number;
    let valid: string;
    let invalid: string;
    let settingTitle: string;
    let keysOfHotkeyCollisions: Array; 
    let keysOfHotKeyDefs: Array;
    let keysOfTips: Array;

    function init() : void {
        keysOfHotkeyCollisions = new Array();
        keysOfHotKeyDefs = keysOf(HOTKEY_DEFS);
        currentTipIndex = 0;
        keysOfTips = new Array("GameSettingHotkeyTip1", "GameSettingHotkeyTip2", "GameSettingHotkeyTip3",
         "GameSettingHotkeyTip4", "GameSettingHotkeyTip5");

        valid = "[✔] ";
        invalid = "[❌] ";
        settingTitle = "";
    }

    function viewTipBox() : m.children {
        return [
            m("div", { class: "blue text-m" }, t(keysOfTips[currentTipIndex])),
            m(".sep10"),
            m(".two-col", [
                m("div", 
                    {
                        style: "cursor: pointer; width: 33%;",
                        onclick: () => {
                            currentTipIndex--;
                            if(currentTipIndex < 0) {
                                currentTipIndex = keysOfTips.length - 1;
                            }
                        }
                    },
                    m(".ml20.blue", iconB("arrow_backward", 24))
                ),
                m("div", { style: "width: 34%; text-align: center;" }, " 💡 "),
                m("div", 
                    {
                        style: "cursor: pointer; width: 33%;",
                        onclick: () => {
                            currentTipIndex++;
                            if(currentTipIndex >= keysOfTips.length) {
                                currentTipIndex = 0;
                            }
                        }
                    },
                    m(".ml20.blue", iconB("arrow_forward", 24))
                )
            ])
        ];
    }

    function updateSettingTitle(prefix: string, keyOfHotkeyDefs: string) : string {
        settingTitle = document.getElementById(keyOfHotkeyDefs+"-hotkeyTitle").innerHTML;
        settingTitle = prefix + settingTitle.substring(4, settingTitle.length);
    }

    function isHotkeyCollision(shortcut: Shortcut) : boolean {
        let n: number = 0;
        for(var i = 0; i < G.world.hotkeys.length; i++) {
            if(shortcut.key === G.world.hotkeys[i].key) {
                if(shortcut.ctrlKey == G.world.hotkeys[i].ctrlKey && 
                shortcut.shiftKey == G.world.hotkeys[i].shiftKey &&
                shortcut.altKey == G.world.hotkeys[i].altKey) {
                    n++;
                    if(n >= 2) {
                        return true; 
                    }
                }
            }
        }
        return false;
    }

    function updateHotkeyStatus() : void {
        console.log('InputSettingsPage.::updateHotkeyStatus');//dev

        let keysOfHotKeyDefs = keysOf(HOTKEY_DEFS);
        let elementId: string;

        for(var i = 0; i < keysOfHotKeyDefs.length; i++) {
            elementId = keysOfHotKeyDefs[i]+"-hotkeyTitle";
            // [dev] Error prevention: allows access to InputSetingsPage (without throwing errors) when a new hotkey
            // has been defined (@HOTKEY_DEFS) but no corrisponding settings element exists yet.
            // to do: add hidden attr to defs? to allow for nonconfigurable hotskeys? (use cases: dev\debug\testing)
            if(!hasValue(document.getElementById(elementId))) { 
                continue; 
            } 

            if(isHotkeyCollision(getHotkeyDef(keysOfHotKeyDefs[i]))) {
                updateSettingTitle(invalid, keysOfHotKeyDefs[i]);
                if(settingTitle != document.getElementById(elementId).innerHTML) {
                    document.getElementById(elementId).innerHTML = settingTitle;
                    keysOfHotkeyCollisions.push(keysOfHotKeyDefs[i]);
                }
            } else {
                updateSettingTitle(valid, keysOfHotKeyDefs[i]);
                if(settingTitle != document.getElementById(elementId).innerHTML) {
                    document.getElementById(elementId).innerHTML = settingTitle;
                    for(var j = 0; j < keysOfHotkeyCollisions.length; j++) {
                        if(keysOfHotKeyDefs[i] === keysOfHotkeyCollisions[j]) {
                            keysOfHotkeyCollisions[j] = "";
                        }
                    }
                }
            }         
        }
    }

    function resolveCollisions() : void {
        let metaStr: string = t("GameSettingHotkeyToastResolveCollision");
        let numCollisions: number = 0;

        for(var j = 0; j < keysOfHotkeyCollisions.length; j++) {
            if("" === keysOfHotkeyCollisions[j]) {
                continue;
            }

            if(D.persisted.hotkeyOverrides[keysOfHotkeyCollisions[j]]) {
                delete D.persisted.hotkeyOverrides[keysOfHotkeyCollisions[j]];
                keysOfHotkeyCollisions[j] = "";
                numCollisions++;
            }
        }

        if(1 <= numCollisions) {
            metaStr = (numCollisions + " " + metaStr);
            G.world.registerHotkeys();
            showToast(metaStr);
        }
    }

    return {
        oninit: () => {
            init();
        },
        oncreate: () => {
            // use case: on reload of a save with hotkey collisions that exited the game while on InputSettingsPage
            // and before InputSettingsage::resolveCollisions() could be called.
            updateHotkeyStatus();
        },
        onupdate: () => {
            updateHotkeyStatus();
        },
        onremove: () => {
            resolveCollisions();
        },
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
                    m(".box.banner.blue", viewTipBox()),
                    m(".box.hotkeys", [
                        m(".title", t("GameSettingHotkey")),
                        m(".hr"),
                        uiHotkeyConfig(t("SwissShop"), "ui-swiss-shop"),
                        m(".hr"),
                        uiHotkeyConfig(t("WholesaleCenter"), "ui-wholesale-center"),
                        m(".hr"),
                        uiHotkeyConfig(t("CentralBank"), "ui-central-bank"),
                        m(".hr"),
                        uiHotkeyConfig(t("ResearchLab"), "ui-research"),
                        m(".hr"),
                        uiHotkeyConfig(t("Headquarter"), "ui-hq"),
                        m(".hr"),
                        uiHotkeyConfig(t("TradeCenter"), "ui-trade-center"),
                        m(".hr"),
                        uiHotkeyConfig(t("PlayerTrade"), "ui-player-trade"),
                        m(".hr"),
                        uiHotkeyConfig(t("StatisticsBureau"), "ui-stats"),
                        m(".hr"),
                        uiHotkeyConfig(t("PolicyCenter"), "ui-policy-center"),
                        m(".hr"),
                        uiHotkeyConfig(t("LogisticsDepartment"), "ui-logistics-department"),
                        m(".hr"),
                        uiHotkeyConfig(t("typoTest"), "ui-typoTest"),
                    ]),
                ]),
            ]);
        },
    };
}