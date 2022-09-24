import { D, G } from "../General/GameData";
import { formatPercent, nf } from "../General/Helper";
import { t } from "../General/i18n";
import {
    leftOrRight,
    uiHeaderActionBack,
    uiSwissBoostBoxContent,
    uiSwissBoostToggleBox,
    uiSwissMoneyBlock,
} from "./UIHelper";

export function SwissBoostPage(): m.Comp {
    return {
        view: () => {
            return m(".modal", { class: leftOrRight() }, [
                uiHeaderActionBack(t("SwissBoost"), () => G.world.routeTo(G.swissShop.grid)),
                m("div.scrollable", [
                    m(".box", [uiSwissMoneyBlock(), m(".hr"), m(".banner.blue.text-m", t("SwissBoostDesc"))]),
                    uiSwissBoostBoxContent(
                        t("ProductionMultiplier"),
                        t("ProductionMultiplierDesc"),
                        `x${nf(D.swissBoosts.productionMultiplier)}`,
                        `${t("Upgrade")} +1`,
                        "productionMultiplier",
                        1.5,
                        1,
                        100 / D.persisted.swissBoostCostDivider,
                        100
                    ),
                    uiSwissBoostBoxContent(
                        t("AutoSellCapacityMultiplierV2"),
                        t("AutoSellCapacityMultiplierDescV2"),
                        `+${nf(D.swissBoosts.autoSellCapacityMultiplier)}%`,
                        `${t("Upgrade")} +1%`,
                        "autoSellCapacityMultiplier",
                        1.5,
                        1,
                        100 / D.persisted.swissBoostCostDivider,
                        25
                    ),
                    uiSwissBoostBoxContent(
                        t("BuildingUpgradeCostDivider"),
                        t("BuildingUpgradeCostDividerDescV2"),
                        `÷${nf(D.swissBoosts.buildingUpgradeCostDivider)}`,
                        `${t("Upgrade")} +1`,
                        "buildingUpgradeCostDivider",
                        1.5,
                        1,
                        100 / D.persisted.swissBoostCostDivider,
                        100
                    ),
                    uiSwissBoostBoxContent(
                        t("BuildingPermitCostDivider"),
                        t("BuildingPermitCostDividerDesc"),
                        `÷${nf(D.swissBoosts.buildingPermitCostDivider)}`,
                        `${t("Upgrade")} +1`,
                        "buildingPermitCostDivider",
                        1.5,
                        1,
                        50 / D.persisted.swissBoostCostDivider,
                        100
                    ),
                    uiSwissBoostBoxContent(
                        t("ExtraBuildingPermit"),
                        t("ExtraBuildingPermitDesc"),
                        `+${D.swissBoosts.extraBuildingPermit}`,
                        `${t("Upgrade")} +1`,
                        "extraBuildingPermit",
                        1.5,
                        1,
                        50 / D.persisted.swissBoostCostDivider,
                        100
                    ),
                    uiSwissBoostBoxContent(
                        t("ExtraTradeQuota"),
                        t("ExtraTradeQuotaDesc"),
                        `+${D.swissBoosts.extraTradeQuota}`,
                        `${t("Upgrade")} +1%`,
                        "extraTradeQuota",
                        1.5,
                        1,
                        50 / D.persisted.swissBoostCostDivider,
                        9
                    ),
                    uiSwissBoostBoxContent(
                        t("IndustryZoneMultiplierSwissBoost"),
                        t("IndustryZoneMultiplierSwissBoostDescV2"),
                        formatPercent(D.swissBoosts.industryZoneCapacityBooster),
                        `${t("Upgrade")} +50%`,
                        "industryZoneCapacityBooster",
                        1.5,
                        0.5,
                        50 / D.persisted.swissBoostCostDivider,
                        100
                    ),
                    uiSwissBoostToggleBox(
                        t("WholesaleCenterOrderFasterV2"),
                        t("WholesaleCenterOrderFasterDesc"),
                        100,
                        "wholesaleUpgrade1"
                    ),
                    uiSwissBoostToggleBox(
                        t("OfflineResearchSwissBoost"),
                        t("OfflineResearchSwissBoostDesc"),
                        100,
                        "offlineResearch"
                    ),
                    uiSwissBoostToggleBox(
                        t("ResourceExplorerAll"),
                        t("ResourceExplorerAllDesc"),
                        100,
                        "resourceExplorerAllDeposits"
                    ),
                    uiSwissBoostToggleBox(t("ProduceAllCrops"), t("ProduceAllCropsDesc"), 100, "produceAllCrops"),
                    uiSwissBoostToggleBox(t("ResearchAgreement"), t("ResearchAgreementDesc"), 100, "researchAgreement"),
                ]),
            ]);
        },
    };
}
