import { D, DLC, G, hasDLC } from "../General/GameData";
import { formatPercent, ifTrue, nf } from "../General/Helper";
import { t } from "../General/i18n";
import {
    leftOrRight,
    uiHeaderActionBack,
    uiBoxToggleContent,
    uiSwissBoostBoxContent,
    uiSwissBoostToggleBox,
    uiSwissMoneyBlock,
} from "./UIHelper";

let isSafetyLocked: boolean = true;

export function SwissBoostPage(): m.Comp {
    return {
        view: () => {
            return m(".modal", { class: leftOrRight() }, [
                uiHeaderActionBack(t("SwissBoost"), () => G.world.routeTo(G.swissShop.grid)),
                m("div.scrollable", [
                    m(".box", [
                        uiSwissMoneyBlock(), 
                        m(".hr.dashed"),
                        uiBoxToggleContent(
                            m(".uppercase.text-s.text-desc.cursor-help", {title: t("SafteyLockTip")}, t("SafteyLock")),
                            isSafetyLocked,
                            () => {
                                isSafetyLocked = !isSafetyLocked;
                            },
                            { style: { margin: "-10px 0" } },
                            24
                        ),
                        m(".hr"), 
                        m(".banner.blue.text-m", t("SwissBoostDesc")),   
                    ]),
                    uiSwissBoostBoxContent(
                        t("ProductionMultiplier"),
                        t("ProductionMultiplierDesc"),
                        `x${nf(D.swissBoosts.productionMultiplier)}`,
                        `${t("Upgrade")} +1`,
                        "productionMultiplier",
                        1.5,
                        1,
                        100 / D.persisted.swissBoostCostDivider,
                        100,
                        isSafetyLocked
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
                        25,
                        isSafetyLocked
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
                        100,
                        isSafetyLocked
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
                        100,
                        isSafetyLocked
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
                        100,
                        isSafetyLocked
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
                        9,
                        isSafetyLocked
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
                        100,
                        isSafetyLocked
                    ),
                    uiSwissBoostToggleBox(
                        t("WholesaleCenterOrderFasterV2"),
                        t("WholesaleCenterOrderFasterDesc"),
                        100,
                        "wholesaleUpgrade1",
                        isSafetyLocked

                    ),
                    uiSwissBoostToggleBox(
                        t("OfflineResearchSwissBoost"),
                        t("OfflineResearchSwissBoostDesc"),
                        100,
                        "offlineResearch",
                        isSafetyLocked
                    ),
                    uiSwissBoostToggleBox(
                        t("ResourceExplorerAll"),
                        t("ResourceExplorerAllDesc"),
                        100,
                        "resourceExplorerAllDeposits",
                        isSafetyLocked
                    ),
                    ifTrue(hasDLC(DLC[2]), () => [
                        uiSwissBoostToggleBox(t("ProduceAllCrops"), t("ProduceAllCropsDesc"), 100, "produceAllCrops", isSafetyLocked),
                    ]),
                    uiSwissBoostToggleBox(t("ResearchAgreement"), t("ResearchAgreementDesc"), 100, "researchAgreement", isSafetyLocked),
                ]),
            ]);
        },
    };
}
