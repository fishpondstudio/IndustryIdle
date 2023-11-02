import { Entity } from "../CoreGame/Logic/Entity";
import { findByType } from "../CoreGame/Logic/Find";
import {
    getPolicyCost,
    getResDiff,
    isAvailable,
    isChristmas,
    isHalloween,
    isLunarNewYear,
    isOctober,
    MAP,
    POLICY,
} from "../CoreGame/Logic/Logic";
import { isPolicyActive } from "../CoreGame/Logic/SelfContained";
import { D, dlcLabel, G, hasDLC } from "../General/GameData";
import { formatHMS, hasValue, ifTrue, keysOf, nf, safeGet } from "../General/Helper";
import { t } from "../General/i18n";
import { CrazyGameAdBanner } from "./CrazyGameAdBanner";
import { iconB, leftOrRight, uiBuildingBasicInfo, uiHeaderRoute } from "./UIHelper";
import { showToast } from "./UISystem";

export function PolicyCenterPage(): m.Comp<{ entity: Entity }> {
    let keyword = "";
    return {
        view: (vnode) => {
            const entity = findByType("PolicyCenter");
            const diff = getResDiff("PP");
            return m("div.modal", { class: leftOrRight() }, [
                uiHeaderRoute(t("PolicyCenter"), "/main"),
                m("div.scrollable", [
                    m(CrazyGameAdBanner),
                    ifTrue(!MAP[D.map].deposits.Cu && !isPolicyActive("AlSemiconductor"), () =>
                        m(".box.banner.blue.text-m", t("PolicyPointNoCopperDesc"))
                    ),
                    ifTrue(isOctober(), () => m(".box.banner.text-m", t("AutumnEvent"))),
                    ifTrue(isHalloween(), () => m(".box.banner.text-m", t("HalloweenEvent"))),
                    ifTrue(isChristmas(), () => m(".box.banner.text-m", t("ChristmasEvent"))),
                    ifTrue(isLunarNewYear(), () => m(".box.banner.text-m", t("LunarNewYearEvent"))),
                    uiBuildingBasicInfo(entity),
                    m(".box.banner.blue.text-m", t("PolicyPointDesc")),
                    m(".box", [
                        m(".title.two-col", [
                            m("div", t("Policies")),
                            m(
                                ".red",
                                diff < 0
                                    ? t("RunOutIn", {
                                          time: formatHMS(1000 * Math.abs(safeGet(entity.resources, "PP", 0) / diff)),
                                      })
                                    : null
                            ),
                        ]),
                        m(".hr"),
                        m(".row", [
                            iconB("search", 24, 10, { margin: "-10px 5px -10px 0" }, { class: "text-desc" }),
                            m("input.f1", {
                                type: "text",
                                placeholder: t("PolicySearchPlaceholder"),
                                oninput: (e) => {
                                    keyword = e.target.value;
                                },
                            }),
                        ]),
                        keysOf(D.policies)
                            .filter(
                                (k) =>
                                    hasDLC(POLICY[k].dlc) &&
                                    isAvailable(POLICY[k]) &&
                                    (POLICY[k].name().toLowerCase().includes(keyword.toLowerCase()) ||
                                        POLICY[k].desc().toLowerCase().includes(keyword.toLowerCase()))
                            )
                            .sort((a, b) => POLICY[a].cost - POLICY[b].cost)
                            .map((k) => {
                                const p = D.policies[k];
                                const policyCost = getPolicyCost(k);
                                const policy = POLICY[k];
                                let s = [m(".text-desc", iconB("lock"))];
                                if (hasDLC(policy.dlc)) {
                                    s = [
                                        m(
                                            ".pointer",
                                            {
                                                class: p.active ? "green" : "red",
                                                onclick: () => {
                                                    if (entity.resources.PP >= policyCost) {
                                                        G.audio.playClick();
                                                        p.active = !p.active;
                                                        policy.onToggle?.(p.active);
                                                    } else {
                                                        G.audio.playError();
                                                        showToast(t("PolicyNotEnoughTime"));
                                                    }
                                                },
                                            },
                                            iconB(p.active ? "toggle_on" : "toggle_off", 24)
                                        ),
                                        m(
                                            ".text-desc.text-s.nobreak",
                                            t("PerSecond", {
                                                time: p.active ? nf(-policyCost) : 0,
                                            })
                                        ),
                                    ];
                                }
                                return [
                                    m(".hr"),
                                    m(".two-col", [
                                        m("div", [
                                            m("div", policy.name()),
                                            m(".text-s.text-desc", policy.desc()),
                                            m(".text-s.orange", [
                                                ifTrue(hasValue(policy.dlc), () => m("span.mr5", dlcLabel(policy.dlc))),
                                                ifTrue(hasValue(policy.available), () =>
                                                    m("span.mr5", t("MapExclusive"))
                                                ),
                                            ]),
                                        ]),
                                        m(".ml20", s),
                                    ]),
                                ];
                            }),
                    ]),
                ]),
            ]);
        },
    };
}
