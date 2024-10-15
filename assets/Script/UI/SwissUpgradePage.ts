import { D, G } from "../General/GameData";
import { formatPercent, nf } from "../General/Helper";
import { t } from "../General/i18n";
import { leftOrRight, uiHeaderActionBack, uiSwissMoneyBlock, uiSwissUpgradeBoxContent } from "./UIHelper";

export function SwissUpgradePage(): m.Comp {
    return {
        view: () => {
            return m(".modal", { class: leftOrRight() }, [
                uiHeaderActionBack(t("SwissUpgrade"), () => G.world.routeTo(G.swissShop.grid)),
                m("div.scrollable", [
                    m(".box", [uiSwissMoneyBlock(), m(".hr"), m(".banner.blue.text-m", t("SwissUpgradeDesc"))]),
                    uiSwissUpgradeBoxContent(
                        t("MaxBuilders"),
                        t("MaxBuildersDesc"),
                        nf(D.persisted.maxBuilders),
                        `${t("Upgrade")} +1`,
                        "maxBuilders",
                        1.75,
                        1,
                        25,
                        10
                    ),
                    uiSwissUpgradeBoxContent(
                        t("BuilderMoveSpeed"),
                        t("BuilderMoveSpeedDesc"),
                        `${D.persisted.builderSpeedUpPercentage}%`,
                        `${t("Upgrade")} +10%`,
                        "builderSpeedUpPercentage",
                        2,
                        10,
                        25,
                        100
                    ),
                    uiSwissUpgradeBoxContent(
                        t("OfflineEarningTime"),
                        t("OfflineEarningTimeDesc"),
                        t("Minutes", {
                            time: nf(D.persisted.offlineEarningMinutes),
                        }),
                        `${t("Upgrade")} +${t("Minutes", { time: 30 })}`,
                        "offlineEarningMinutes",
                        1.5,
                        30,
                        50,
                        24 * 60
                    ),
                    uiSwissUpgradeBoxContent(
                        t("ProductionMultiplier"),
                        t("ProductionMultiplierDesc"),
                        `x${nf(D.persisted.productionMultiplier)}`,
                        `${t("Upgrade")} +1`,
                        "productionMultiplier",
                        1.75,
                        1,
                        100,
                        100
                    ),
                    uiSwissUpgradeBoxContent(
                        t("AutoSellCapacityMultiplierV2"),
                        t("AutoSellCapacityMultiplierDescV2"),
                        `+${nf(D.persisted.autoSellCapacityMultiplier)}%`,
                        `${t("Upgrade")} +1%`,
                        "autoSellCapacityMultiplier",
                        1.75,
                        1,
                        100,
                        25
                    ),
                    uiSwissUpgradeBoxContent(
                        t("BuildingUpgradeCostDivider"),
                        t("BuildingUpgradeCostDividerDescV2"),
                        `÷${nf(D.persisted.buildingUpgradeCostDivider)}`,
                        `${t("Upgrade")} +1`,
                        "buildingUpgradeCostDivider",
                        1.75,
                        1,
                        100,
                        100
                    ),
                    uiSwissUpgradeBoxContent(
                        t("BuildingPermitCostDivider"),
                        t("BuildingPermitCostDividerDesc"),
                        `÷${nf(D.persisted.buildingPermitCostDivider)}`,
                        `${t("Upgrade")} +1`,
                        "buildingPermitCostDivider",
                        1.75,
                        1,
                        50,
                        100
                    ),
                    uiSwissUpgradeBoxContent(
                        t("ExtraBuildingPermit"),
                        t("ExtraBuildingPermitDesc"),
                        `+${D.persisted.extraBuildingPermit}`,
                        `${t("Upgrade")} +1`,
                        "extraBuildingPermit",
                        1.75,
                        1,
                        50,
                        100
                    ),
                    uiSwissUpgradeBoxContent(
                        t("ExtraTradeQuota"),
                        t("ExtraTradeQuotaDesc"),
                        `+${D.persisted.extraTradeQuota}`,
                        `${t("Upgrade")} +1%`,
                        "extraTradeQuota",
                        1.75,
                        1,
                        100,
                        10
                    ),
                    uiSwissUpgradeBoxContent(
                        t("FuelCostDiscount"),
                        t("FuelCostDiscountDesc"),
                        `${D.persisted.fuelDiscount}%`,
                        `${t("Upgrade")} +5%`,
                        "fuelDiscount",
                        1.75,
                        5,
                        50,
                        50
                    ),
                    uiSwissUpgradeBoxContent(
                        t("ExtraAdjacentBonus"),
                        t("ExtraAdjacentBonusDesc"),
                        `${D.persisted.extraAdjacentBonus}%`,
                        `${t("Upgrade")} +5%`,
                        "extraAdjacentBonus",
                        1.75,
                        5,
                        50,
                        50
                    ),
                    uiSwissUpgradeBoxContent(
                        t("SellRefundPercentage"),
                        t("SellRefundPercentageDesc"),
                        `${D.persisted.sellRefundPercentage}%`,
                        `${t("Upgrade")} +5%`,
                        "sellRefundPercentage",
                        1.75,
                        5,
                        50,
                        100
                    ),
                    uiSwissUpgradeBoxContent(
                        t("IndustryZoneMultiplierSwissBoost"),
                        t("IndustryZoneMultiplierSwissBoostDescV2"),
                        formatPercent(D.persisted.industryZoneCapacityBooster),
                        `${t("Upgrade")} +50%`,
                        "industryZoneCapacityBooster",
                        1.5,
                        0.5,
                        50,
                        100
                    ),
                    uiSwissUpgradeBoxContent(
                        t("SwissBoostCostDivider"),
                        t("SwissBoostCostDividerDesc"),
                        `÷${nf(D.persisted.swissBoostCostDivider)}`,
                        `${t("Upgrade")} +1`,
                        "swissBoostCostDivider",
                        2,
                        1,
                        500,
                        10
                    ),
                ]),
            ]);
        },
    };
}
