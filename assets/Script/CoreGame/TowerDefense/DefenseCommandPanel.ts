import { D, G } from "../../General/GameData";
import { keysOf, nf } from "../../General/Helper";
import { t } from "../../General/i18n";
import { showToast } from "../../UI/UISystem";
import { batchApply, batchModeLabel } from "../Logic/BatchMode";
import { DefenseCommandEntity, Entity } from "../Logic/Entity";
import { getCash, RES, trySpendCash, Weapon } from "../Logic/Logic";
import {
    addDefenseModule,
    getBaseModuleCost,
    getModuleDamage,
    upgradeBaseModule,
    upgradeDefenseModule,
} from "./DefenseModules";

export function DefenseCommandPanel(): m.Component<{ entity: Entity }> {
    return {
        view: (vnode) => {
            const entity = vnode.attrs.entity as DefenseCommandEntity;
            const addModuleCost = getBaseModuleCost(entity);
            return [
                m(".box", [
                    m(".two-col-r", [
                        m("div", [
                            m("div", t("DefenseCommandConvert")),
                            m(".text-desc.text-s", [t("DefenseCommandConvertDesc")]),
                            m(
                                ".text-s.orange",
                                `1 ${RES[entity.inputResource].name()} = ${nf(
                                    D.price[entity.inputResource].price
                                )} ${RES.Dmg.name()}`
                            ),
                        ]),
                        m(
                            "select.text-m",
                            {
                                onchange: (e) => {
                                    entity.inputResource = e.target.value;
                                },
                            },
                            keysOf(Weapon)
                                .sort((a, b) => RES[a].name().localeCompare(RES[b].name()))
                                .map((k) => {
                                    return m(
                                        "option",
                                        {
                                            key: k,
                                            value: k,
                                            selected: entity.inputResource === k,
                                        },
                                        RES[k].name()
                                    );
                                })
                        ),
                    ]),
                    m(
                        ".mt5.text-m.blue.pointer",
                        {
                            onclick: () => {
                                G.audio.playClick();
                                batchApply(entity, (e: DefenseCommandEntity) => {
                                    e.inputResource = entity.inputResource;
                                });
                            },
                        },
                        t("ApplyToBatch", { batch: batchModeLabel() })
                    ),
                    m(".hr"),
                    m(".title", t("DefenseModuleBaseModule")),
                    m(".hr"),
                    m(".row", [
                        m(".f1.text-center", [
                            m(".text-s.text-desc", t("DefenseModuleRange")),
                            m(".text-l.mv10", entity.range),
                            upgradeBaseModule(entity, "range"),
                        ]),
                        m(".vline"),
                        m(".f1.text-center", [
                            m(".text-s.text-desc", t("DefenseModuleAttackSpeed")),
                            m(".text-l.mv10", t("PerSecond", { time: entity.attackSpeed })),
                            upgradeBaseModule(entity, "attackSpeed"),
                        ]),
                        m(".vline"),
                        m(".f1.text-center", [
                            m(".text-s.text-desc", t("DefenseModuleBulletSpeed")),
                            m(".text-l.mv10", t("PerSecond", { time: entity.bulletSpeed })),
                            upgradeBaseModule(entity, "bulletSpeed"),
                        ]),
                    ]),
                    m(".hr"),
                    m("table", [
                        m("tr", [
                            m("th"),
                            m("th.r", t("DefenseModuleDamage")),
                            m(
                                "th.r.cursor-help",
                                { title: t("DefenseModuleCriticalDamageChance") },
                                t("DefenseModuleCriticalDamageChanceShort")
                            ),
                            m(
                                "th.r.cursor-help",
                                { title: t("DefenseModuleCriticalDamageMultiplier") },
                                t("DefenseModuleCriticalDamageMultiplierShort")
                            ),
                        ]),
                        entity.modules.map((module, idx) => {
                            return m("tr", [
                                m("td.text-m.text-desc", `#${idx + 1}`),
                                m("td.r", { style: { width: "30%" } }, [
                                    m("div", nf(getModuleDamage(entity, module))),
                                    m(".mt5", upgradeDefenseModule(module, "damage")),
                                ]),
                                m("td.r", { style: { width: "30%" } }, [
                                    m("div", module.criticalDamageChance),
                                    m(".mt5", upgradeDefenseModule(module, "criticalDamageChance")),
                                ]),
                                m("td.r", { style: { width: "30%" } }, [
                                    m("div", module.criticalDamageMultiplier),
                                    m(".mt5", upgradeDefenseModule(module, "criticalDamageMultiplier")),
                                ]),
                            ]);
                        }),
                    ]),
                    m(".hr"),
                    m(
                        ".row.pointer",
                        {
                            class: getCash() >= addModuleCost ? "blue" : "text-desc",
                            onclick: () => {
                                if (trySpendCash(getBaseModuleCost(entity))) {
                                    G.audio.playClick();
                                    addDefenseModule(entity);
                                } else {
                                    G.audio.playError();
                                    showToast(t("NotEnoughCash"));
                                }
                            },
                        },
                        [m(".f1", t("DefenseModuleAddOne")), m("div", `$${nf(addModuleCost)}`)]
                    ),
                ]),
            ];
        },
    };
}
