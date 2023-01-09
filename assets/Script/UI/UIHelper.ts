import { Buildings } from "../CoreGame/Buildings/BuildingDefinitions";
import { Entity, getInput, getOutput, InputOverrideFallback } from "../CoreGame/Logic/Entity";
import {
    BLD,
    BooleanKeyOf,
    getCash,
    getCostForBuilding,
    getResDiff,
    getSellRefundPercentage,
    getUpgradeCost,
    levelToNextMultiplier,
    NumericKeyOf,
    refundCash,
    RES,
    swissBoostCost,
    swissUpgradeCost,
    trySpendCash,
} from "../CoreGame/Logic/Logic";
import { getInputAmount, getOutputAmount, getUpgradeMultiplier } from "../CoreGame/Logic/Production";
import { SCENES } from "../General/Constants";
import { 
    D,
    DLC,
    G,
    hasDLC,
    PersistedData, 
    saveData,
    SwissBoosts,
    T 
} from "../General/GameData";
import {
    firstKeyOf,
    forEach,
    getHotkeyDef,
    getOrSet,
    hasValue,
    HOTKEY_DEFS,
    ifTrue,
    keysOf,
    mapOf,
    nf,
    numberSign,
    sizeOf,
} from "../General/Helper";
import { t } from "../General/i18n";
import { isAndroid, isIOS, isSteam, NativeSdk, steamworks } from "../General/NativeSdk";
import { Shortcut } from "../General/Hotkey";
import { Desktop } from "./HudPage";
import { isDataLoaded } from "./ResourceLoader";
import { hideLoader, routeTo, showLoader, showToast, UI_ROUTES } from "./UISystem";

export function icon(name: string, size = 24, marginRight = 0, additionalStyle = {}, additionalAttrs = {}) {
    return m(
        "i.mi",
        {
            style: {
                fontSize: `${size}px`,
                marginRight: `${marginRight}px`,
                ...additionalStyle,
            },
            ...additionalAttrs,
        },
        name
    );
}

export function isMobile() {
    return isIOS() || isAndroid();
}

export function iconB(name: string, size = 24, marginRight = 0, additionalStyle = {}, additionalAttrs = {}) {
    Object.assign(additionalStyle, { display: "block" });
    return icon(name, size, marginRight, additionalStyle, additionalAttrs);
}

export function getContainerClass(isDesktop: boolean): string {
    let containerClass = leftOrRight();
    containerClass += isDesktop ? " secondary-desktop-container" : " modal";
    if (Desktop.showChat) {
        containerClass += " has-chat";
    }
    return containerClass;
}

export function uiHeaderAction(title: m.Children, onClose: () => void, onDock?: () => void) {
    return m(".header", [
        title,
        m(".mi.close", {
            "data-shortcut": "escape-false-false-false",
            onclick: onClose,
        }),
        ifTrue(!!onDock, () => m(".mi.dock.left", { "data-shortcut": "--false-false-false", onclick: onDock })),
    ]);
}

export function uiHeaderActionBack(title: m.Children, onClose: () => void, onDock?: () => void) {
    return m(".header", [
        title,
        m(".mi.back", {
            "data-shortcut": "escape-false-false-false",
            onclick: onClose,
        }),
        ifTrue(!!onDock, () => m(".mi.dock.right", { onclick: onDock })),
    ]);
}

export function uiHeaderRoute(title: m.Children, routeOnClose: keyof typeof UI_ROUTES = "/main") {
    return uiHeaderAction(title, () => {
        routeTo(routeOnClose);
    });
}

export function uiSwissMoneyBlock(): m.Vnode {
    return m(".two-col", [
        m("div", [
            m("div", t("PrestigeCurrency")),
            m(".text-desc.text-s", t("PrestigeCurrencyDesc")),
            m(
                ".orange.text-s",
                t("AllTimeSwissMoneyEarned", {
                    number: nf(D.persisted.allPrestigeCurrency),
                })
            ),
        ]),
        m(".ml20.blue", nf(D.persisted.prestigeCurrency)),
    ]);
}

export function leftOrRight(defaultPosition = "right"): string {
    if (m.route.param("left") === "1") {
        return "left";
    }
    if (m.route.param("left") === "0") {
        return "right";
    }
    if (D.persisted.panelPosition === "left" || D.persisted.panelPosition === "leftFloat") {
        return "left";
    }
    if (D.persisted.panelPosition === "right" || D.persisted.panelPosition === "rightFloat") {
        return "right";
    }
    return defaultPosition;
}

export function uiBoxContent(
    title: m.Children,
    desc: m.Children,
    value: m.Children,
    action: m.Children,
    onAction: () => void,
    enabled = true
) {
    let actionBlock: m.Children = action;
    if (typeof action === "string") {
        actionBlock = m("div", action);
    }
    return m(".box", [
        m(".two-col", [m("div", [m("div", title), m(".text-s.text-desc", desc)]), m(".ml20", value)]),
        m(".action", { onclick: onAction, class: enabled ? "" : "disabled" }, actionBlock),
    ]);
}

export function uiBoxToggle(
    title: m.Children,
    desc: m.Children,
    value: boolean,
    onAction: () => void,
    shortcut: {key: string, ctrlKey: boolean, shiftKey: boolean, altKey: boolean}
) {
    return uiBoxToggleContent(
        [
            m("div", [shortcut ? uiHotkey(shortcut, "", " ") : null, title]), m(".text-s.text-desc", desc)
        ],
        value,
        onAction,
        { "data-shortcut": [shortcut ? (shortcut.key+"-"+shortcut.ctrlKey+"-"+shortcut.shiftKey+"-"+shortcut.altKey) : ""}
    );
}

export function uiBoxToggleContent(
    content: m.Children,
    value: boolean,
    onAction: () => void,
    attrs = {},
    iconSize = 32
) {
    return m("div.two-col", [
        m("div", content),
        m(
            ".ml10.pointer",
            Object.assign(attrs, {
                class: value ? "green" : "red",
                onclick: onAction,
            }),
            iconB(value ? "toggle_on" : "toggle_off", iconSize)
        ),
    ]);
}

export function uiBoxRangeSlider(
    title: m.Children,
    desc: m.Children,
    id: string,
    defaultVal: number,
    min: number,
    max: number,
    step: number,
    onInput: () => void,
    hotkey: string = null
) {
    return m("box", [ 
        m("div", title), 
        m(".text-s.text-desc", desc)],
        m("input", {
            type: "range",
            id: id;
            defaultValue: defaultVal;
            min: min;
            max: max;
            step: step;
            oninput: onInput;
        }),
    );
}

export function uiHotkey(shortcut: Shortcut, pre = "", post = "") : string {
    if (D.persisted.hideHotkeySubmenuLabels || isIOS() || isAndroid()) {
        return "";
    }
    let finalShortcutOutput: string = "";
    if(shortcut.ctrlKey) {
        finalShortcutOutput += "Ctrl+";
    }
    if(shortcut.shiftKey) {
        finalShortcutOutput += "Shift+";
    }
    if(shortcut.altKey) {
        finalShortcutOutput += "Alt+";
    }
    finalShortcutOutput += shortcut.key.toUpperCase();
    return `${pre}[${finalShortcutOutput}]${post}`;
}

export function uiHotkeySetting(title: m.Children, keyOfHotkey: string) {
    if(!hasValue(HOTKEY_DEFS[keyOfHotkey])) {
        return m("div", [
            m("div", { style: "color: red" }, 'uiHotkeySetting::SOFT_ERROR'),
            m(
                ".text-desc.text-s", 
                '@param keyOfHotkey: string; ['+keyOfHotkey+'] No matching definition found in HOTKEY_DEFS.'
            ),
        ])
    }

    const VaildHotkeyOptions = [ // numeric keys [0-9] 'reserved' for use by data-shortcut / uiHotkey
    "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", 
    "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"
    ] as const;

    let settingTitle: string = "[❓] "+title;
    let keyOptionsId: string = keyOfHotkey+"-keyOptions";
    let hotkeyRootId: string = keyOfHotkey+"-hotkeySetting";
    let hotkeyTitleId: string = keyOfHotkey+"-hotkeyTitle";
    let hotkeyModifiersId: string = keyOfHotkey+"-hotkeyModifiers";
    let ctrlBoxId: string = keyOfHotkey+"-ctrlBox";
    let shiftBoxId: string = keyOfHotkey+"-shiftBox";
    let altBoxId: string = keyOfHotkey+"-altBox";
    let resetId: string = keyOfHotkey+"-hotkeyReset";
    let checkboxCSS: string = "width: initial;";
    let labelCSS: string = "text-transform: uppercase; font-size: 0.85rem; margin-left: 4px; margin-right: 8px;";
    let isCtrlProtected: boolean = false;
    let isShiftProtected: boolean = false;
    let isAltProtected: boolean = false;
    
    function protectReservedModifer(hotkeyDef: Shortcut, modKey: string) : boolean {
        // Prevents the user defining a key combination that is reserved by the OS and or Browser.
        // Safe / Protected from Intercept: Ctrl+N, Ctrl+Shift+N, Ctrl+T, Ctrl+Shift+N, Ctrl+W, Ctrl+Shift+W
        switch(hotkeyDef.key) {
            case "n":
                isCtrlProtected = isShiftProtected = true;
                isAltProtected = false;
                switch(modKey)
                {
                    case "Control":
                    case "Shift":
                        return false;
                    case "Alt":
                        return hotkeyDef.altKey;
                }
            case "t":
                isCtrlProtected = true;
                isShiftProtected = isAltProtected = false;
                switch(modKey)
                {
                    case "Control":
                        return false;
                    case "Shift":
                        return hotkeyDef.shiftKey;
                    case "Alt":
                        return hotkeyDef.altKey;
                }
            case "w":
                isCtrlProtected = isShiftProtected = true;
                isAltProtected = false;
                switch(modKey)
                {
                    case "Control":
                    case "Shift":
                        return false;
                    case "Alt":
                        return hotkeyDef.altKey;
                }
            default:
                isCtrlProtected = isShiftProtected = isAltProtected = false;
                switch(modKey)
                {
                    case "Control":
                        return hotkeyDef.ctrlKey;
                    case "Shift":
                        return hotkeyDef.shiftKey;
                    case "Alt":
                        return hotkeyDef.altKey;
                }
        }
    }

    function getKeyModifierState(modKey: string) : boolean {
        switch(modKey) {
            // if an override exists compare values against D.persisted.hotkeyOverrides[keyOfHotkey]
            // else compare values against HOTKEY_DEFS[keyOfHotkey]. protectReservedModifer method
            // prevents attempted use of OS / Browser reserved shortcuts in-game. 
            case "Control":
                return protectReservedModifer(getHotkeyDef(keyOfHotkey), "Control") ? true : false;
            case "Shift":
                return protectReservedModifer(getHotkeyDef(keyOfHotkey), "Shift") ? true : false;
            case "Alt":
                return protectReservedModifer(getHotkeyDef(keyOfHotkey), "Alt") ? true : false;
        }
        return false;
    }

    function ifDefaultConvertToOverride() : void {
        if(!hasValue(D.persisted.hotkeyOverrides[keyOfHotkey])) {
            D.persisted.hotkeyOverrides[keyOfHotkey] = { 
                key: HOTKEY_DEFS[keyOfHotkey].key, 
                ctrlKey: getKeyModifierState("Control"), 
                shiftKey: getKeyModifierState("Shift"), 
                altKey: getKeyModifierState("Alt")
            };
        } 
    }

    function removeHotkeyOverride() : void {
        if(hasValue(D.persisted.hotkeyOverrides[keyOfHotkey])) {
            isCtrlProtected = isShiftProtected = isAltProtected = false;
            delete D.persisted.hotkeyOverrides[keyOfHotkey];
            G.world.registerHotkeys();
        }
    }

    function isEqualToDefault() : boolean {
        if(D.persisted.hotkeyOverrides[keyOfHotkey].key === HOTKEY_DEFS[keyOfHotkey].key &&
            D.persisted.hotkeyOverrides[keyOfHotkey].ctrlKey == HOTKEY_DEFS[keyOfHotkey].ctrlKey &&
            D.persisted.hotkeyOverrides[keyOfHotkey].shiftKey == HOTKEY_DEFS[keyOfHotkey].shiftKey &&
            D.persisted.hotkeyOverrides[keyOfHotkey].altKey == HOTKEY_DEFS[keyOfHotkey].altKey) {
            return true;
        } else {
            return false;
        }
    }

    return m(".two-col", { id: hotkeyRootId }, [
        m("div", { id: "left-col" }, [
            m("div", { id: hotkeyTitleId }, settingTitle),
            m("div", { id: hotkeyModifiersId }, [
                m(".sep10"),
                m("input", {
                    type: "checkbox",
                    style: checkboxCSS,
                    id: ctrlBoxId,
                    checked: getKeyModifierState("Control"),
                    oninput: (e) => {
                        if(isCtrlProtected) {
                            showToast(t("GameSettingHotkeyToastReservedHotkey"));
                            G.audio.playError();
                            return;
                        }
                        G.audio.playClick();
                        ifDefaultConvertToOverride();
                        D.persisted.hotkeyOverrides[keyOfHotkey].ctrlKey = !D.persisted.hotkeyOverrides[keyOfHotkey].ctrlKey;
                        if(isEqualToDefault()) {
                            removeHotkeyOverride();
                        }
                        G.world.registerHotkeys();
                    },
                }),
                m("label", { for: ctrlBoxId, style: labelCSS, }, t("GameSettingHotkeyCtrl")),
                m("input", {
                    type: "checkbox",
                    style: checkboxCSS,
                    id: shiftBoxId,
                    checked: getKeyModifierState("Shift"),
                    oninput: (e) => {
                        if(isShiftProtected) {
                            showToast(t("GameSettingHotkeyToastReservedHotkey"));
                            G.audio.playError();
                            return;
                        }
                        G.audio.playClick();
                        ifDefaultConvertToOverride();
                        D.persisted.hotkeyOverrides[keyOfHotkey].shiftKey = !D.persisted.hotkeyOverrides[keyOfHotkey].shiftKey;
                        if(isEqualToDefault()) {
                            removeHotkeyOverride();
                        }
                        G.world.registerHotkeys();
                    },
                }),
                m("label", { for: shiftBoxId, style: labelCSS, }, t("GameSettingHotkeyShift")),
                m("input", {
                    type: "checkbox",
                    style: checkboxCSS,
                    id: altBoxId,
                    checked: getKeyModifierState("Alt"),
                    oninput: (e) => {
                        if(isAltProtected) {
                            showToast(t("GameSettingHotkeyToastReservedHotkey"));
                            G.audio.playError();
                            return;
                        }
                        G.audio.playClick();
                        ifDefaultConvertToOverride();
                        D.persisted.hotkeyOverrides[keyOfHotkey].altKey = !D.persisted.hotkeyOverrides[keyOfHotkey].altKey;
                        if(isEqualToDefault()) {
                            removeHotkeyOverride();
                        }
                        G.world.registerHotkeys();
                    },
                }), 
                m("label", { for: altBoxId, style: labelCSS, }, t("GameSettingHotkeyAlt")),
            ]),
        ]),
        m("div", { id: "right-col" },
            m("select.text-m",
                {
                    id: keyOptionsId,
                    onchange: async (e) => {
                        G.audio.playClick();
                        D.persisted.hotkeyOverrides[keyOfHotkey] = { 
                            key: e.target.value, 
                            ctrlKey: false, 
                            shiftKey: false, 
                            altKey: false
                        };
                        if(isEqualToDefault()) {
                            removeHotkeyOverride();
                        }
                        G.world.registerHotkeys();
                    },
                },
                VaildHotkeyOptions.map((k) =>
                    m(
                        "option",
                        {
                            key: k,
                            value: k,
                            selected: getHotkeyDef(keyOfHotkey).key === k,
                        },
                        `${k.toUpperCase()}`
                    )
                )
            ),
            m("div", { id: resetId }, [
                m(".sep10"),
                m(".mt5.text-m",
                    {
                        class: hasValue(D.persisted.hotkeyOverrides[keyOfHotkey]) ? "blue pointer" : "text-desc",
                        onclick: () => {
                            removeHotkeyOverride();
                        },
                    },
                    t("ColorThemeEditorReset")
                ),
            ]),
        ),
    ]);
}

export function uiBuildingInputOutput(b: keyof Buildings) {
    const output = { ...BLD[b].staticOutput } as Record<string, number>;
    if (BLD[b].power > 0) {
        output[t("Power")] = 0;
    }
    return [
        uiRecipeInputOut(BLD[b].staticInput, output),
        ifTrue(hasValue(BLD[b].desc), () => m(".text-desc.text-s", BLD[b].desc())),
    ];
}

export function uiRecipeInputOut(
    input: Record<string, number>,
    output: Record<string, number>,
    cssClass = "text-desc text-s",
    highlightClass = "dark"
): m.Children {
    return [
        ifTrue(sizeOf(input) > 0, () => {
            return m(".row", { class: cssClass }, [
                m("div", iconB("login", 14, 5)),
                m(
                    ".f1",
                    keysOf(input).map((r, i) => [
                        i === 0 ? "" : ", ",
                        m(
                            "span.nobreak",
                            { class: T.res[r] > 0 ? highlightClass : "" },
                            `${RES[r].name()} x${input[r]}`
                        ),
                    ])
                ),
            ]);
        }),
        ifTrue(sizeOf(output) > 0, () => {
            return m(".row", { class: cssClass }, [
                m("div", iconB("logout", 14, 5)),
                m(
                    ".f1",
                    keysOf(output).map((r, i) => [
                        i === 0 ? "" : ", ",
                        m("span.nobreak", [RES[r] ? RES[r].name() : r, output[r] ? ` x${output[r]}` : ""]),
                    ])
                ),
            ]);
        }),
    ];
}

export function uiBuildingBasicInfo(entity: Entity) {
    const bld = BLD[entity.type];
    const downgradeRefund = () =>
        Math.min(D.cashSpent, getCostForBuilding(entity.type, entity.level) * getSellRefundPercentage());
    return m(".box", [
        m(".two-col", [m("div", t("Level")), m("div", entity.level)]),
        m(".hr"),
        m(".two-col", [
            m("div", [m("div", t("Multiplier")), m(".text-s.text-desc", t("MultiplierDesc"))]),
            m("div", `x${getUpgradeMultiplier(entity)}`),
        ]),
        m(".hr"),
        m("div.row", [
            m(
                ".f1",
                mapOf(getInput(entity), (k, _) =>
                    m("div", [
                        RES[k].name(),
                        m(
                            "span.text-s.text-desc.ml5",
                            t("PerSecond", {
                                time: nf(getInputAmount(entity, k)),
                            })
                        ),
                    ])
                )
            ),
            m(".text-center.text-desc", iconB("east")),
            m(
                ".f1.text-right",
                mapOf(getOutput(entity), (k, _) =>
                    m("div", [
                        m(
                            "span.text-s.text-desc.mr5",
                            t("PerSecond", {
                                time: nf(getOutputAmount(entity, k)),
                            })
                        ),
                        RES[k].name(),
                    ])
                )
            ),
        ]),
        m(".hr.dashed"),
        uiBoxToggleContent(
            m(
                ".uppercase.text-s.text-desc",
                t("BuildingResourceConversion", {
                    resource: RES[firstKeyOf(bld.staticOutput)].name(),
                })
            ),
            !entity.turnOff,
            () => (entity.turnOff = !entity.turnOff),
            { style: { margin: "-10px 0" } },
            24
        ),
        ifTrue(hasDLC(DLC[1]), () => [
            m(".hr.dashed"),
            uiBoxToggleContent(
                m(".uppercase.text-s.text-desc", t("MultipleSources")),
                entity.partialTransport,
                () => (entity.partialTransport = !entity.partialTransport),
                { style: { margin: "-10px 0" } },
                24
            ),
        ]),
        m(".hr"),
        m(".title", t("Storage")),
        keysOf(entity.resources).map((r) => {
            if (!bld.staticOutput[r]) {
                return null;
            }
            const diff = getResDiff(r);
            return [
                m(".hr"),
                m(".two-col", [
                    m("div", RES[r].name()),
                    m("div", [
                        m("div", nf(getOrSet(entity.resources, r, 0))),
                        m(".text-s", { class: diff >= 0 ? "green" : "red" }, [
                            numberSign(diff),
                            t("PerSecond", { time: nf(Math.abs(diff)) }),
                        ]),
                    ]),
                ]),
            ];
        }),
        [1, 5, levelToNextMultiplier(entity)].map((n, index) => {
            const getBuildingUpgradeCost = () =>
                getUpgradeCost(entity.level, n, (l) => getCostForBuilding(entity.type, l));
            const upgradeCost = getBuildingUpgradeCost();
            const shortcutKey = index + 1;
            return [
                m(".hr"),
                m(
                    ".two-col.pointer",
                    {
                        class: getCash() >= upgradeCost ? "blue" : "text-desc",
                        "data-shortcut": shortcutKey.toString()+"-false-false-false",
                        onclick: () => {
                            if (trySpendCash(getBuildingUpgradeCost())) {
                                entity.level += n;
                                G.audio.playClick();
                            } else {
                                showToast(t("NotEnoughCash"));
                                G.audio.playError();
                            }
                            return false;
                        },
                    },
                    [
                        m("div", `${uiHotkey({key: shortcutKey.toString(), ctrlKey: false, shiftKey: false, altKey: false}, "", " ")}${t("Upgrade")} x${n}`),
                        m(".ml20", `$${nf(upgradeCost)}`),
                    ]
                ),
            ];
        }),
        ifTrue(entity.level > 1, () => [
            m(".hr"),
            m(
                ".two-col.red.pointer",
                {
                    onclick: () => {
                        G.audio.playClick();
                        if (entity.level > 1) {
                            entity.level--;
                            refundCash(downgradeRefund());
                        }
                    },
                },
                [m("div", t("DowngradeBuilding")), m("div", `+$${nf(downgradeRefund())}`)]
            ),
        ]),
    ]);
}

export function switchScene(scene: typeof SCENES[keyof typeof SCENES]) {
    showLoader();
    routeTo("/main");
    cc.director.loadScene(scene, () => {
        hideLoader();
        m.redraw();
    });
}

export function progressBarWithLabel(label: m.Children, finished: number, total: number): m.Children {
    if (finished >= total) {
        return m(".two-col.text-m.text-desc", [
            m("div", label),
            m(".row", [iconB("check_circle", 16, 5, {}, { class: "green" }), `${nf(finished)}/${nf(total)}`]),
        ]);
    }
    return [
        progressBar(finished, total),
        m(".sep5"),
        m(".two-col.text-m.red", [m("div", label), m("div", `${nf(finished)}/${nf(total)}`)]),
    ];
}

export function progressBar(finished: number, total: number): m.Children {
    return m(
        ".progress",
        m(".fill", {
            style: {
                width: `${Math.min(100, (100 * finished) / total)}%`,
            },
        })
    );
}

export async function saveAndQuit() {
    if (isDataLoaded()) {
        showLoader();
        forEach(T.dots, (_, t) => {
            const building = D.buildings[t.fromXy];
            if (!building) {
                return;
            }
            if (isFinite(building.resources[t.type])) {
                building.resources[t.type] += t.amount;
            } else {
                building.resources[t.type] = t.amount;
            }
        });
        await saveData();
    }
    NativeSdk.quit();
}

export function saveAndForcefullyReload() {
    showLoader();
    saveData().then(() => {
        if (isSteam()) {
            steamworks.forcefullyReload();
        } else {
            window.location.reload();
        }
    });
}

export function reloadGame() {
    window.location.reload();
}

export function isPanelOnLeft(mouseIsOnLeft: () => boolean): boolean {
    let left = false;
    if (D.persisted.panelPosition === "left" || D.persisted.panelPosition === "leftFloat") {
        left = true;
    } else if (D.persisted.panelPosition === "right" || D.persisted.panelPosition === "rightFloat") {
        left = false;
    } else {
        left = mouseIsOnLeft();
    }
    return left;
}

export function uiSwissUpgradeBoxContent(
    title: m.Children,
    desc: m.Children,
    value: m.Children,
    action: m.Children,
    key: NumericKeyOf<PersistedData>,
    growthBase: number,
    step: number,
    startCost: number,
    maxValue: number
): m.Children {
    const getCost = () => swissUpgradeCost(key, growthBase, step, startCost);
    const cost = getCost();
    let button = m(".row", [m("div", t("MaxUpgrade")), m(".f1")]);
    if (D.persisted[key] < maxValue) {
        button = m(".row", [m("div", action), m(".f1"), m("div", `${t("SwissMoney", { money: nf(cost) })}`)]);
    } else {
        // @ts-expect-error
        D.persisted[key] = maxValue;
    }
    return uiBoxContent(
        title,
        desc,
        value,
        button,
        () => {
            if (D.persisted[key] >= maxValue) {
                G.audio.playError();
                showToast(t("MaxUpgradeDesc"));
                return;
            }
            const cost = getCost();
            if (D.persisted.prestigeCurrency < cost) {
                G.audio.playError();
                showToast(t("NotEnoughSwissMoney"));
                return;
            }

            D.persisted.prestigeCurrency -= cost;
            D.persisted[key] += step;
            G.audio.playClick();
        },
        D.persisted[key] >= maxValue || D.persisted.prestigeCurrency >= getCost()
    );
}

export function uiSwissBoostBoxContent(
    title: m.Children,
    desc: m.Children,
    value: m.Children,
    action: m.Children,
    key: NumericKeyOf<SwissBoosts>,
    growthBase: number,
    step: number,
    startCost: number,
    maxValue: number
): m.Children {
    const getCost = () => swissBoostCost(key, growthBase, step, startCost);
    const cost = getCost();
    let button = m(".row", [m("div", t("MaxUpgrade")), m(".f1")]);
    if (D.swissBoosts[key] < maxValue) {
        button = m(".row", [m("div", action), m(".f1"), m("div", `${t("SwissMoney", { money: nf(cost) })}`)]);
    } else {
        D.swissBoosts[key] = maxValue;
    }
    return uiBoxContent(
        title,
        desc,
        value,
        button,
        () => {
            if (D.swissBoosts[key] >= maxValue) {
                G.audio.playError();
                showToast(t("MaxUpgradeDesc"));
                return;
            }
            const cost = getCost();
            if (D.persisted.prestigeCurrency < cost) {
                G.audio.playError();
                showToast(t("NotEnoughSwissMoney"));
                return;
            }

            D.persisted.prestigeCurrency -= cost;
            D.swissBoosts[key] += step;
            G.audio.playClick();
        },
        D.swissBoosts[key] >= maxValue || D.persisted.prestigeCurrency >= getCost()
    );
}

export function uiSwissBoostToggleBox(
    title: m.Children,
    desc: m.Children,
    cost: number,
    key: BooleanKeyOf<SwissBoosts>
): m.Children {
    return m(
        ".box",
        m(".two-col", [
            m("div", [m("div", title), m(".text-desc.text-s", desc)]),
            D.swissBoosts[key]
                ? iconB("check_circle", 24, 0, {}, { class: "green" })
                : m(
                      ".pointer.nobreak.ml10",
                      {
                          onclick: () => {
                              if (D.persisted.prestigeCurrency < cost) {
                                  G.audio.playError();
                                  showToast(t("NotEnoughSwissMoney"));
                                  return;
                              }
                              G.audio.playClick();
                              D.persisted.prestigeCurrency -= cost;
                              D.swissBoosts[key] = true;
                          },
                          class: D.persisted.prestigeCurrency < cost ? "disabled" : "blue",
                      },
                      `${t("SwissMoney", { money: nf(cost) })}`
                  ),
        ])
    );
}

export const InputOverrideFallbackOptions: Record<InputOverrideFallback, () => string> = {
    skip: () => t("BuildingSourceFallbackSkip"),
    drain: () => t("BuildingSourceFallbackDrain"),
    auto: () => t("BuildingSourceFallbackAuto"),
};
