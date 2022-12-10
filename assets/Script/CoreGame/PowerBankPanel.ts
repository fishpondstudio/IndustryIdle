import { formatPercent, nf } from "../General/Helper";
import { t } from "../General/i18n";
import { stringToGrid } from "./GridHelper";
import { Entity, PowerBankEntity } from "./Logic/Entity";
import { BLD } from "./Logic/Logic";
import { getPowerBankCapacityMultiplier, getPowerBankChargePerTick, isPowerBankWorking } from "./Logic/Production";

export function PowerBankPanel(): m.Component<{ entity: Entity }> {
    return {
        view: (vnode) => {
            const entity = vnode.attrs.entity as PowerBankEntity;
            const building = BLD[entity.type];
            const chargeSpeed = getPowerBankChargePerTick(entity);
            const total = chargeSpeed * getPowerBankCapacityMultiplier();
            return [
                !isPowerBankWorking(stringToGrid(entity.grid))
                    ? m(".box.banner.text-m", t("PowerBankNotWorking"))
                    : null,
                m(".box", [
                    m(".two-col", [
                        m("div", m("div", t("PowerBankChargeSpeed"))),
                        m("div", `${nf(chargeSpeed)}W`),
                    ]),
                    m(".hr.dashed"),
                    m(
                        ".progress",
                        m(".fill", {
                            style: {
                                width: `${Math.min(100, (100 * entity.powerLeft) / total)}%`,
                            },
                        })
                    ),
                    m(".sep5"),
                    m(".two-col.text-m.text-desc", [
                        m("div", t("PowerBankPowerLeft")),
                        m("div", `${nf(entity.powerLeft)}J/${nf(total)}J (${formatPercent(entity.powerLeft / total)})`),
                    ]),
                ]),
            ];
        },
    };
}
