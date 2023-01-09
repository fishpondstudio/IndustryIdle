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
import { D, DLC, G, hasDLC, PersistedData, saveData, SwissBoosts, T } from "../General/GameData";
import {
    firstKeyOf,
    forEach,
    getOrSet,
    hasValue,
    ifTrue,
    keysOf,
    mapOf,
    nf,
    numberSign,
    sizeOf,
} from "../General/Helper";
import { t } from "../General/i18n";
import { isAndroid, isIOS, isSteam, NativeSdk, steamworks } from "../General/NativeSdk";
import { Desktop } from "./HudPage";
import { isDataLoaded } from "./ResourceLoader";
import { shortcut } from "./Shortcut";
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
            "data-shortcut": "escape",
            onclick: onClose,
        }),
        ifTrue(!!onDock, () => m(".mi.dock.left", { onclick: onDock })),
    ]);
}

export function uiHeaderActionBack(title: m.Children, onClose: () => void, onDock?: () => void) {
    return m(".header", [
        title,
        m(".mi.back", {
            "data-shortcut": "escape",
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
    hotkey: string = null
) {
    return uiBoxToggleContent(
        [m("div", [hotkey ? shortcut(hotkey, "", " ") : null, title]), m(".text-s.text-desc", desc)],
        value,
        onAction,
        { "data-shortcut": hotkey }
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
        [m("div", [hotkey ? shortcut(hotkey, "", " ") : null, title]), m(".text-s.text-desc", desc)],
        m("input", {
            type: "range",
            id: id;
            defaultValue: defaultVal;
            min: min;
            max: max;
            step: step;
            oninput: onInput;
        }),
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
                        "data-shortcut": shortcutKey,
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
                        m("div", `${shortcut(shortcutKey, "", " ")}${t("Upgrade")} x${n}`),
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
    maxValue: number,
    isLocked: boolean
): m.Children {
    const getCost = () => swissUpgradeCost(key, growthBase, step, startCost);
    const cost = getCost();
    let button: m.Children = m(".row", [m("div", t("MaxUpgrade")), m(".f1")]);
    if(isLocked) {
         button = m(".row", [
                m("div.green", iconB("lock", 16, 5)),
                m("div", action),
                m(".f1"),
                m("div", `${t("SwissMoney", { money: nf(cost) })}`),
        ]);
    } else if (D.persisted[key] < maxValue) {
         button = m(".row", [
                m("div.red", {title: t("SafetyUnlockedTip")}, iconB("lock_open", 16, 5)),
                m("div", action),
                m(".f1"),
                m("div", `${t("SwissMoney", { money: nf(cost) })}`),
        ]);
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
            if(isLocked) {
                G.audio.playClick();
                showToast(t("SafetyLockToast"));
                return;
            }                
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
    maxValue: number,
    isLocked: boolean
): m.Children {
    const getCost = () => swissBoostCost(key, growthBase, step, startCost);
    const cost = getCost();
    let button: m.Children = m(".row", [m("div", t("MaxUpgrade")), m(".f1")]);
    if(isLocked) {
         button = m(".row", [
            m("div.green", iconB("lock", 16, 5)),
            m("div", action),
            m(".f1"),
            m("div", `${t("SwissMoney", { money: nf(cost) })}`),
        ]);
    } else if (D.swissBoosts[key] < maxValue) {
        button = m(".row", [
            m("div.red", {title: t("SafetyUnlockedTip")}, iconB("lock_open", 16, 5)),
            m("div", action),
            m(".f1"),
            m("div", `${t("SwissMoney", { money: nf(cost) })}`),
        ]);
    } else {
        D.swissBoosts[key] = maxValue;
    }
    return uiBoxContent(
        title,
        desc,
        value,
        button,
        () => {
            if(isLocked) {
                G.audio.playClick();
                showToast(t("SafetyLockToast"));
                return;
            }
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
    key: BooleanKeyOf<SwissBoosts>,
    isLocked: boolean
): m.Children {
    if(D.swissBoosts[key]) {
        return m(".box",
            m(".two-col", [
                m("div", [m("div", title), m(".text-desc.text-s", desc)]),
                iconB("check_circle", 24, 0, {}, { class: "green" })  
            ])
        );
    } else {
        return m(
            ".box",
            m(".two-col", [
                m("div", [
                    m(".two-col", [
                        isLocked 
                            ? m("div", iconB("lock", 16, 0, {}, { class: "green" }))
                            : m("div", iconB("lock_open", 16, 0, {}, { class: "red" })),
                            m("div", {style: "text-align: left;"}, title)
                    ]),
                    m(".text-desc.text-s", desc),
                ]),
                m(
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
}

export const InputOverrideFallbackOptions: Record<InputOverrideFallback, () => string> = {
    skip: () => t("BuildingSourceFallbackSkip"),
    drain: () => t("BuildingSourceFallbackDrain"),
    auto: () => t("BuildingSourceFallbackAuto"),
};
