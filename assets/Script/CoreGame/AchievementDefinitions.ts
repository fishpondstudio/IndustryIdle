import { D, G, T } from "../General/GameData";
import { forEach, sizeOf } from "../General/Helper";
import { t } from "../General/i18n";
import { NativeSdk } from "../General/NativeSdk";
import { showToast } from "../UI/UISystem";
import { BuildingNumberMap } from "./Buildings/BuildingDefinitions";
import { activeInputOutput, BLD, canShowStat, getCash, getPrestigeCurrency } from "./Logic/Logic";

interface AchievementItem {
    name: () => string;
    desc: () => string;
    achieved: () => boolean;
    reward: number;
}

export class Achievements {
    Stockholm100: AchievementItem = {
        name: () => t("AchievementStockholm100"),
        desc: () => t("AchievementStockholm100Desc"),
        achieved: () => D.map === "Stockholm" && getPrestigeCurrency() >= 100,
        reward: 5,
    };
    Stockholm500: AchievementItem = {
        name: () => t("AchievementStockholm500"),
        desc: () => t("AchievementStockholm500Desc"),
        achieved: () => D.map === "Stockholm" && getPrestigeCurrency() >= 500,
        reward: 10,
    };
    Stockholm1000: AchievementItem = {
        name: () => t("AchievementStockholm1000"),
        desc: () => t("AchievementStockholm1000Desc"),
        achieved: () => D.map === "Stockholm" && getPrestigeCurrency() >= 1000,
        reward: 15,
    };
    Oslo100: AchievementItem = {
        name: () => t("AchievementOslo100"),
        desc: () => t("AchievementOslo100Desc"),
        achieved: () => D.map === "Oslo" && getPrestigeCurrency() >= 100,
        reward: 5,
    };
    Oslo500: AchievementItem = {
        name: () => t("AchievementOslo500"),
        desc: () => t("AchievementOslo500Desc"),
        achieved: () => D.map === "Oslo" && getPrestigeCurrency() >= 500,
        reward: 10,
    };
    Oslo1000: AchievementItem = {
        name: () => t("AchievementOslo1000"),
        desc: () => t("AchievementOslo1000Desc"),
        achieved: () => D.map === "Oslo" && getPrestigeCurrency() >= 1000,
        reward: 15,
    };
    Rotterdam100: AchievementItem = {
        name: () => t("AchievementRotterdam100"),
        desc: () => t("AchievementRotterdam100Desc"),
        achieved: () => D.map === "Rotterdam" && getPrestigeCurrency() >= 100,
        reward: 5,
    };
    Rotterdam500: AchievementItem = {
        name: () => t("AchievementRotterdam500"),
        desc: () => t("AchievementRotterdam500Desc"),
        achieved: () => D.map === "Rotterdam" && getPrestigeCurrency() >= 500,
        reward: 10,
    };
    Rotterdam1000: AchievementItem = {
        name: () => t("AchievementRotterdam1000"),
        desc: () => t("AchievementRotterdam1000Desc"),
        achieved: () => D.map === "Rotterdam" && getPrestigeCurrency() >= 1000,
        reward: 15,
    };
    Detroit100: AchievementItem = {
        name: () => t("AchievementDetroit100"),
        desc: () => t("AchievementDetroit100Desc"),
        achieved: () => D.map === "Detroit" && getPrestigeCurrency() >= 100,
        reward: 5,
    };
    Detroit500: AchievementItem = {
        name: () => t("AchievementDetroit500"),
        desc: () => t("AchievementDetroit500Desc"),
        achieved: () => D.map === "Detroit" && getPrestigeCurrency() >= 500,
        reward: 10,
    };
    Detroit1000: AchievementItem = {
        name: () => t("AchievementDetroit1000"),
        desc: () => t("AchievementDetroit1000Desc"),
        achieved: () => D.map === "Detroit" && getPrestigeCurrency() >= 1000,
        reward: 15,
    };
    Boston100: AchievementItem = {
        name: () => t("AchievementBoston100"),
        desc: () => t("AchievementBoston100Desc"),
        achieved: () => D.map === "Boston" && getPrestigeCurrency() >= 100,
        reward: 5,
    };
    Boston500: AchievementItem = {
        name: () => t("AchievementBoston500"),
        desc: () => t("AchievementBoston500Desc"),
        achieved: () => D.map === "Boston" && getPrestigeCurrency() >= 500,
        reward: 10,
    };
    Boston1000: AchievementItem = {
        name: () => t("AchievementBoston1000"),
        desc: () => t("AchievementBoston1000Desc"),
        achieved: () => D.map === "Boston" && getPrestigeCurrency() >= 1000,
        reward: 15,
    };
    Rome100: AchievementItem = {
        name: () => t("AchievementRome100"),
        desc: () => t("AchievementRome100Desc"),
        achieved: () => D.map === "Rome" && getPrestigeCurrency() >= 100,
        reward: 5,
    };
    Rome500: AchievementItem = {
        name: () => t("AchievementRome500"),
        desc: () => t("AchievementRome500Desc"),
        achieved: () => D.map === "Rome" && getPrestigeCurrency() >= 500,
        reward: 10,
    };
    Rome1000: AchievementItem = {
        name: () => t("AchievementRome1000"),
        desc: () => t("AchievementRome1000Desc"),
        achieved: () => D.map === "Rome" && getPrestigeCurrency() >= 1000,
        reward: 15,
    };
    Hamburg100: AchievementItem = {
        name: () => t("AchievementHamburg100"),
        desc: () => t("AchievementHamburg100Desc"),
        achieved: () => D.map === "Hamburg" && getPrestigeCurrency() >= 100,
        reward: 5,
    };
    Hamburg500: AchievementItem = {
        name: () => t("AchievementHamburg500"),
        desc: () => t("AchievementHamburg500Desc"),
        achieved: () => D.map === "Hamburg" && getPrestigeCurrency() >= 500,
        reward: 10,
    };
    Hamburg1000: AchievementItem = {
        name: () => t("AchievementHamburg1000"),
        desc: () => t("AchievementHamburg1000Desc"),
        achieved: () => D.map === "Hamburg" && getPrestigeCurrency() >= 1000,
        reward: 15,
    };
    Toulouse100: AchievementItem = {
        name: () => t("AchievementToulouse100"),
        desc: () => t("AchievementToulouse100Desc"),
        achieved: () => D.map === "Toulouse" && getPrestigeCurrency() >= 100,
        reward: 5,
    };
    Toulouse500: AchievementItem = {
        name: () => t("AchievementToulouse500"),
        desc: () => t("AchievementToulouse500Desc"),
        achieved: () => D.map === "Toulouse" && getPrestigeCurrency() >= 500,
        reward: 10,
    };
    Toulouse1000: AchievementItem = {
        name: () => t("AchievementToulouse1000"),
        desc: () => t("AchievementToulouse1000Desc"),
        achieved: () => D.map === "Toulouse" && getPrestigeCurrency() >= 1000,
        reward: 15,
    };
    HongKong100: AchievementItem = {
        name: () => t("AchievementHongKong100"),
        desc: () => t("AchievementHongKong100Desc"),
        achieved: () => D.map === "HongKong" && getPrestigeCurrency() >= 100,
        reward: 5,
    };
    HongKong500: AchievementItem = {
        name: () => t("AchievementHongKong500"),
        desc: () => t("AchievementHongKong500Desc"),
        achieved: () => D.map === "HongKong" && getPrestigeCurrency() >= 500,
        reward: 10,
    };
    HongKong1000: AchievementItem = {
        name: () => t("AchievementHongKong1000"),
        desc: () => t("AchievementHongKong1000Desc"),
        achieved: () => D.map === "HongKong" && getPrestigeCurrency() >= 1000,
        reward: 15,
    };
    StPetersburg100: AchievementItem = {
        name: () => t("AchievementStPetersburg100"),
        desc: () => t("AchievementStPetersburg100Desc"),
        achieved: () => D.map === "StPetersburg" && getPrestigeCurrency() >= 100,
        reward: 5,
    };
    StPetersburg500: AchievementItem = {
        name: () => t("AchievementStPetersburg500"),
        desc: () => t("AchievementStPetersburg500Desc"),
        achieved: () => D.map === "StPetersburg" && getPrestigeCurrency() >= 500,
        reward: 10,
    };
    StPetersburg1000: AchievementItem = {
        name: () => t("AchievementStPetersburg1000"),
        desc: () => t("AchievementStPetersburg1000Desc"),
        achieved: () => D.map === "StPetersburg" && getPrestigeCurrency() >= 1000,
        reward: 15,
    };
    Osaka100: AchievementItem = {
        name: () => t("AchievementOsaka100"),
        desc: () => t("AchievementOsaka100Desc"),
        achieved: () => D.map === "Osaka" && getPrestigeCurrency() >= 100,
        reward: 5,
    };
    Osaka500: AchievementItem = {
        name: () => t("AchievementOsaka500"),
        desc: () => t("AchievementOsaka500Desc"),
        achieved: () => D.map === "Osaka" && getPrestigeCurrency() >= 500,
        reward: 10,
    };
    Osaka1000: AchievementItem = {
        name: () => t("AchievementOsaka1000"),
        desc: () => t("AchievementOsaka1000Desc"),
        achieved: () => D.map === "Osaka" && getPrestigeCurrency() >= 1000,
        reward: 15,
    };
    Vancouver100: AchievementItem = {
        name: () => t("AchievementVancouver100"),
        desc: () => t("AchievementVancouver100Desc"),
        achieved: () => D.map === "Vancouver" && getPrestigeCurrency() >= 100,
        reward: 5,
    };
    Vancouver500: AchievementItem = {
        name: () => t("AchievementVancouver500"),
        desc: () => t("AchievementVancouver500Desc"),
        achieved: () => D.map === "Vancouver" && getPrestigeCurrency() >= 500,
        reward: 10,
    };
    Vancouver1000: AchievementItem = {
        name: () => t("AchievementVancouver1000"),
        desc: () => t("AchievementVancouver1000Desc"),
        achieved: () => D.map === "Vancouver" && getPrestigeCurrency() >= 1000,
        reward: 15,
    };
    SoftwareGiant: AchievementItem = {
        name: () => t("AchievementSoftwareGiant"),
        desc: () => t("AchievementSoftwareGiantDesc"),
        achieved: () => {
            return hasBuildingsLevelHigherThan({
                SoftwareCompany: 10,
                OperatingSystemCompany: 10,
                DatabaseCompany: 10,
                WebBrowser: 10,
            });
        },
        reward: 10,
    };
    SpaceRace: AchievementItem = {
        name: () => t("AchievementSpaceRace"),
        desc: () => t("AchievementSpaceRaceDesc"),
        achieved: () => {
            return hasBuildingsLevelHigherThan({
                RocketFactory: 10,
                SatelliteFactory: 10,
                SpaceshipFactory: 10,
                SpaceStationFactory: 10,
            });
        },
        reward: 10,
    };
    ToTheMoon: AchievementItem = {
        name: () => t("AchievementToTheMoon"),
        desc: () => t("AchievementToTheMoonDesc"),
        achieved: () => {
            return (
                hasBuildingsLevelHigherThan({
                    DogecoinFarm: 40,
                    BitcoinFarm: 40,
                }) &&
                T.res.Bit >= 1e9 &&
                T.res.Doge >= 1e9
            );
        },
        reward: 10,
    };
    ItsAllGreen: AchievementItem = {
        name: () => t("ItsAllGreen"),
        desc: () => t("ItsAllGreenDesc"),
        achieved: () => {
            let greenCount = 0;
            let totalCount = 0;
            const activeIO = activeInputOutput();
            forEach(activeIO, (k, v) => {
                if (!canShowStat(k) || (v[0] <= 0 && v[1] <= 0)) {
                    return;
                }
                totalCount++;
                if (v[1] >= v[0] && v[1] > 0) {
                    greenCount++;
                }
            });
            return totalCount === greenCount && greenCount >= 50;
        },
        reward: 10,
    };
    DeepInRed: AchievementItem = {
        name: () => t("DeepInRed"),
        desc: () => t("DeepInRedDesc"),
        achieved: () => {
            let count = 0;
            forEach(activeInputOutput(), (k, v) => {
                if (v[1] > 0 && v[0] > v[1]) {
                    count++;
                }
            });
            return count >= 50;
        },
        reward: 5,
    };
    BarbariansAtTheGate: AchievementItem = {
        name: () => t("BarbariansAtTheGate"),
        desc: () => t("BarbariansAtTheGateDesc"),
        achieved: () => {
            return D.tradeAmount >= 1e12;
        },
        reward: 5,
    };
    DiversifiedProductions: AchievementItem = {
        name: () => t("DiversifiedProductions"),
        desc: () => t("DiversifiedProductionsDesc"),
        achieved: () => {
            return sizeOf(T.buildingCount) >= 100;
        },
        reward: 5,
    };
    RealEstateTycoon: AchievementItem = {
        name: () => t("RealEstateTycoon"),
        desc: () => t("RealEstateTycoonDesc"),
        achieved: () => {
            return sizeOf(D.buildings) >= 400;
        },
        reward: 5,
    };
    GreenPeacekeeper: AchievementItem = {
        name: () => t("GreenPeacekeeper"),
        desc: () => t("GreenPeacekeeperDesc"),
        achieved: () => {
            const activeIO = activeInputOutput();
            return (
                (activeIO.Army[1] > 0 || activeIO.Navy[1] > 0 || activeIO.AirFc[1] > 0 || activeIO.SpFc[1] > 0) &&
                hasOnlyRenewable()
            );
        },
        reward: 10,
    };
    DotComTycoon: AchievementItem = {
        name: () => t("DotComTycoon"),
        desc: () => t("DotComTycoonDesc"),
        achieved: () => {
            return hasBuildingsLevelHigherThan({
                SocialNetworkInc: 10,
                SkyNetInc: 10,
                MusifyInc: 10,
                SearchEngineCompany: 10,
            });
        },
        reward: 10,
    };
    SanJose100: AchievementItem = {
        name: () => t("AchievementSanJose100"),
        desc: () => t("AchievementSanJose100Desc"),
        achieved: () => D.map === "SanJose" && getPrestigeCurrency() >= 100,
        reward: 5,
    };
    SanJose500: AchievementItem = {
        name: () => t("AchievementSanJose500"),
        desc: () => t("AchievementSanJose500Desc"),
        achieved: () => D.map === "SanJose" && getPrestigeCurrency() >= 500,
        reward: 10,
    };
    SanJose1000: AchievementItem = {
        name: () => t("AchievementSanJose1000"),
        desc: () => t("AchievementSanJose1000Desc"),
        achieved: () => D.map === "SanJose" && getPrestigeCurrency() >= 1000,
        reward: 15,
    };
    CrowdfundingTycoon: AchievementItem = {
        name: () => t("AchievementCrowdfundingTycoon"),
        desc: () => t("AchievementCrowdfundingTycoonDesc"),
        achieved: () => {
            let result = false;
            forEach(D.crowdfunding, (_, cf) => {
                // 1Qa of cash
                if (cf.value >= 1e15) {
                    result = true;
                }
            });
            return result;
        },
        reward: 10,
    };
    CashIsKing: AchievementItem = {
        name: () => t("AchievementCashIsKing"),
        desc: () => t("AchievementCashIsKingDesc"),
        achieved: () => {
            return getCash() >= 1e15;
        },
        reward: 5,
    };
    PowerTycoon: AchievementItem = {
        name: () => t("AchievementPowerTycoon"),
        desc: () => t("AchievementPowerTycoonDesc"),
        achieved: () => {
            return T.current.powerSupply > 1e9;
        },
        reward: 5,
    };
    Istanbul100: AchievementItem = {
        name: () => t("AchievementIstanbul100"),
        desc: () => t("AchievementIstanbul100Desc"),
        achieved: () => D.map === "Istanbul" && getPrestigeCurrency() >= 100,
        reward: 5,
    };
    Istanbul500: AchievementItem = {
        name: () => t("AchievementIstanbul500"),
        desc: () => t("AchievementIstanbul500Desc"),
        achieved: () => D.map === "Istanbul" && getPrestigeCurrency() >= 500,
        reward: 10,
    };
    Istanbul1000: AchievementItem = {
        name: () => t("AchievementIstanbul1000"),
        desc: () => t("AchievementIstanbul1000Desc"),
        achieved: () => D.map === "Istanbul" && getPrestigeCurrency() >= 1000,
        reward: 15,
    };
    Perth100: AchievementItem = {
        name: () => t("AchievementPerth100"),
        desc: () => t("AchievementPerth100Desc"),
        achieved: () => D.map === "Perth" && getPrestigeCurrency() >= 100,
        reward: 5,
    };
    Perth500: AchievementItem = {
        name: () => t("AchievementPerth500"),
        desc: () => t("AchievementPerth500Desc"),
        achieved: () => D.map === "Perth" && getPrestigeCurrency() >= 500,
        reward: 10,
    };
    Perth1000: AchievementItem = {
        name: () => t("AchievementPerth1000"),
        desc: () => t("AchievementPerth1000Desc"),
        achieved: () => D.map === "Perth" && getPrestigeCurrency() >= 1000,
        reward: 15,
    };
    KansasCity100: AchievementItem = {
        name: () => t("AchievementKansasCity100"),
        desc: () => t("AchievementKansasCity100Desc"),
        achieved: () => D.map === "KansasCity" && getPrestigeCurrency() >= 100,
        reward: 5,
    };
    KansasCity500: AchievementItem = {
        name: () => t("AchievementKansasCity500"),
        desc: () => t("AchievementKansasCity500Desc"),
        achieved: () => D.map === "KansasCity" && getPrestigeCurrency() >= 500,
        reward: 10,
    };
    KansasCity1000: AchievementItem = {
        name: () => t("AchievementKansasCity1000"),
        desc: () => t("AchievementKansasCity1000Desc"),
        achieved: () => D.map === "KansasCity" && getPrestigeCurrency() >= 1000,
        reward: 15,
    };
    RioDeJaneiro100: AchievementItem = {
        name: () => t("AchievementRioDeJaneiro100"),
        desc: () => t("AchievementRioDeJaneiro100Desc"),
        achieved: () => D.map === "RioDeJaneiro" && getPrestigeCurrency() >= 100,
        reward: 5,
    };
    RioDeJaneiro500: AchievementItem = {
        name: () => t("AchievementRioDeJaneiro500"),
        desc: () => t("AchievementRioDeJaneiro500Desc"),
        achieved: () => D.map === "RioDeJaneiro" && getPrestigeCurrency() >= 500,
        reward: 10,
    };
    RioDeJaneiro1000: AchievementItem = {
        name: () => t("AchievementRioDeJaneiro1000"),
        desc: () => t("AchievementRioDeJaneiro1000Desc"),
        achieved: () => D.map === "RioDeJaneiro" && getPrestigeCurrency() >= 1000,
        reward: 15,
    };
    RandomIsland100: AchievementItem = {
        name: () => t("AchievementRandomIsland100"),
        desc: () => t("AchievementRandomIsland100Desc"),
        achieved: () => D.map === "RandomIsland" && getPrestigeCurrency() >= 100,
        reward: 5,
    };
    RandomIsland500: AchievementItem = {
        name: () => t("AchievementRandomIsland500"),
        desc: () => t("AchievementRandomIsland500Desc"),
        achieved: () => D.map === "RandomIsland" && getPrestigeCurrency() >= 500,
        reward: 10,
    };
    RandomIsland1000: AchievementItem = {
        name: () => t("AchievementRandomIsland1000"),
        desc: () => t("AchievementRandomIsland1000Desc"),
        achieved: () => D.map === "RandomIsland" && getPrestigeCurrency() >= 1000,
        reward: 15,
    };
    FishPond200: AchievementItem = {
        name: () => t("AchievementFishPond200"),
        desc: () => t("AchievementFishPond200Desc"),
        achieved: () => {
            return T.buildingCount.FishPond >= 200;
        },
        reward: 15,
    };
    Auckland100: AchievementItem = {
        name: () => t("AchievementAuckland100"),
        desc: () => t("AchievementAuckland100Desc"),
        achieved: () => D.map === "Auckland" && getPrestigeCurrency() >= 100,
        reward: 5,
    };
    Auckland500: AchievementItem = {
        name: () => t("AchievementAuckland500"),
        desc: () => t("AchievementAuckland500Desc"),
        achieved: () => D.map === "Auckland" && getPrestigeCurrency() >= 500,
        reward: 5,
    };
    Auckland1000: AchievementItem = {
        name: () => t("AchievementAuckland1000"),
        desc: () => t("AchievementAuckland1000Desc"),
        achieved: () => D.map === "Auckland" && getPrestigeCurrency() >= 1000,
        reward: 5,
    };
}

function hasOnlyRenewable(): boolean {
    let result = true;
    forEach(D.buildings, (xy, v) => {
        if (BLD[v.type].power > 0 && v.type !== "WindTurbine" && v.type !== "SolarPanel") {
            result = false;
            return true;
        }
        return false;
    });
    return result;
}

function hasBuildingsLevelHigherThan(buildings: BuildingNumberMap): boolean {
    forEach(D.buildings, (xy, entity) => {
        if (buildings[entity.type] && entity.level >= buildings[entity.type]) {
            delete buildings[entity.type];
        }
    });
    return cc.js.isEmptyObject(buildings);
}

export const ACH = new Achievements();

export function getAchievementsToClaim() {
    let result = 0;
    forEach(D.persisted.achievements, (k, v) => {
        if (v.achieved && !v.claimed) {
            result++;
        }
    });
    return result;
}

export function tickAchievements() {
    const achieved = D.persisted.achievements;
    forEach(ACH, (k, v) => {
        if (!achieved[k] && v.achieved()) {
            achieved[k] = { achieved: true, claimed: false };
            G.audio.playLevelUp();
            showToast(t("AchievementsToast", { name: v.name() }));
            NativeSdk.activateAchievement(k);
        }
    });
}

export const ACH_IMG = {
    Stockholm100: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/0fb1a1ad21a7e10ae13630bdb5a2120bbe5eb81e.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/c0ab59e6beebb30e04c36e52332eb24c50aad8a1.jpg",
    ],
    Stockholm500: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/ace3f38313eeee96ca374ef270a1d4312cc2fa70.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/7f2bde4891cc41e93689a4038364ca32f5a1de3a.jpg",
    ],
    Stockholm1000: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/ca694d9b3ac1dbab2ef5d05c20a045fe0d72a740.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/e1ca98862f7fac1cb92647982e921e87386350af.jpg",
    ],
    Rotterdam100: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/b55dc188ff171cb4058e9da75ed4b3144e76beae.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/d7b92b484a25ea10dcabf2db6f7ed6263f70a5e3.jpg",
    ],
    Rotterdam500: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/99c448f1bc8b65781319e1062f16467de6567049.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/ec09aed40df9cd3eff6248f11df587ed9ddc606e.jpg",
    ],
    Rotterdam1000: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/adb1ed331ffa192e7c9d16cc14dfb72f9b3d30ce.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/67b097e79d652127a602e0d73593e6f1dfcb255a.jpg",
    ],
    Oslo100: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/121b8cdc1b3785e87108fccff16e48387806055a.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/bf2e29fd08a6614c8128a98521050f962fd4a881.jpg",
    ],
    Oslo500: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/356846607a2a621c1ec75397d498fb3e66afc90e.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/d25f372592e9fb773ed89a35d83d0a91e727b4b3.jpg",
    ],
    Oslo1000: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/0f438217139a9c94674704e988cfeb96e4578f98.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/a531a3399f6c5c05b35d416c45644c0451ba2a93.jpg",
    ],
    Detroit100: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/9b28116d532638e91889b0b21ae24713bb97c433.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/b702a3de25c263907681771171ecb56d21c1e69f.jpg",
    ],
    Detroit500: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/9bf6adbb0f639186320bac9cacce42a2a4b1aed0.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/b8be3363a877e5f20b7f4ce5005471ebf48ec75b.jpg",
    ],
    Detroit1000: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/036c7ec5b5631d3b91a0ffd12aef837774a1e68b.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/e0e95c49ed55414ca1bd4883d4f105a64c823692.jpg",
    ],
    Boston100: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/54a90f51f62bf4d8dd1458a0dfc6423a71dc2959.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/2aeca9199f9fb7bb7fad0f68ebd04374839ca972.jpg",
    ],
    Boston500: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/bcdcddfe84fb0f04bfe9f207b279f01992c3ffa3.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/8d183942d3b32dd08a8918e33dbc8b36854d76d0.jpg",
    ],
    Boston1000: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/8f6b002313860eee714fa46fb6330ebdcaaf24f9.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/b6353e69e51e641da90259def142ef034d72fe1a.jpg",
    ],
    Rome100: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/c4068e8e99debe0d6b84a615856fb3c3a249129e.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/e98f2bd8adf02a9ad9e3e8557e3d9e112e72c27d.jpg",
    ],
    Rome500: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/ddd88b74925ca2a9d86fb823ede59c87ef6a28b5.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/ca03a4f4f3338b9a3ea4ebbfda13d0faab9d81e3.jpg",
    ],
    Rome1000: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/1d685d4034c6c1589f1a4a9aff5d740c77293b33.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/284cda9bfe2396d7f2a12c97f341af20a44dc5bb.jpg",
    ],
    Hamburg100: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/9d2d035f73e1b7acd14bc2b72234d667cc760af2.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/d4331305cf3c4d0c835b1e5ce3b733c26ad2ceb2.jpg",
    ],
    Hamburg500: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/72179f39d4521e56afddbc16e16e416c8149ec79.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/c39209e745bfd73f420ace6d39b54a3845e0fd76.jpg",
    ],
    Hamburg1000: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/ea57ab6c89d950002cafa590dbc66b4653708136.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/a9ad288c875d91cb8313d808e9989070d595d28f.jpg",
    ],
    Toulouse100: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/576f5c3a5137773fa17e677e8042aeb62bc90a4a.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/a0e468ff38e3ce3dff3eb0ead4ffee48441bcee3.jpg",
    ],
    Toulouse500: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/bec3206be24db5a238c146398ca24d78ab868fe5.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/09b33920dc5147439325755617e4574ae3242cec.jpg",
    ],
    Toulouse1000: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/8d256ad836d2a0e9bf59e8e8308029c4152e3b40.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/3986f78d5d4e4d28e4545f6dd1d6cec509aedabe.jpg",
    ],
    HongKong100: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/2758c88c29bc1c93f228cb240135d497c05fdf50.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/cd2fb7e153897a734fb92f9fe8179b97badb0d04.jpg",
    ],
    HongKong500: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/7bdedb55245c72bc0cfa09779f93892775318e5f.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/80eb679f2e6f7816d9325c80f952c88d748545d8.jpg",
    ],
    HongKong1000: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/f6d5f67a4c4a68c08b89bba8e0844dce85da907a.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/35a30e3ccb9d4653bf57ccad212fee8d4c2c301b.jpg",
    ],
    StPetersburg100: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/d8ee28fd9f34bfe85775bf706887f0f79c655778.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/96e82e814c6900fc4c663138e400e78f81e71cec.jpg",
    ],
    StPetersburg500: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/3de9213d93aeb9e9af056ec91a6df4a10465dd58.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/d75362c3cba7ce63be769144e8aa866ad5794e85.jpg",
    ],
    StPetersburg1000: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/553ad508d935fb8f725086814d1d26aafceec666.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/d219f7b1c6871970812d165170519f87a1585307.jpg",
    ],
    Osaka100: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/e4e2d73dc291ea982236710a1db7a9b9ce8f2024.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/03be893f39f55d5f2adde959c770d7bb0f5828e6.jpg",
    ],
    Osaka500: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/4903fdbeca6591233b4a1b37577ab2653f0dc2fe.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/af0d5364784a4e804d47d03771c8a1648d728fb1.jpg",
    ],
    Osaka1000: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/a456aa991997c2e35f8fbdb033b19a131d214544.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/473eb484a15188d55aa329d225f0c8466e3ae476.jpg",
    ],
    SoftwareGiant: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/f00ae9a7ceb85df53c518dd75766373769df307b.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/46197504fbac96a316620d286f738a922911234f.jpg",
    ],
    SpaceRace: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/1b6ae6be262217f3fa1058376244d479819d7a0c.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/5d7f4446c0e0edf6722609e26761eed259bac361.jpg",
    ],
    ToTheMoon: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/f6f50ab2808019dcaf0e363e0a69b83b5ae67c48.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/fdc009324b98cc5e2a6b889c39257bb2f1153896.jpg",
    ],
    ItsAllGreen: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/a90b1a3bcbde627cc01fa250b7362b59cbf38a9e.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/3ec1569d0ef48ecd2bfd5eb869e062362344e574.jpg",
    ],
    DeepInRed: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/f097f31d7f0eca2628742f466ef6985d527c1ba8.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/5929bb394b958fb0ebae6f7962eaae1c05388cde.jpg",
    ],
    Vancouver100: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/766ffc74eed1fb1b92cce66637ded1e88cd537ef.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/9606661e032f387d2354737f5c32b7b16407cbbd.jpg",
    ],
    Vancouver500: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/9d4cbde1520a7ea27f58c74028fb4a0c92df1289.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/8d936b24b1f4ad5b4bc9913bc7acb73d33ddef71.jpg",
    ],
    Vancouver1000: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/43995f594a2d2e01061ad9ccd1c366beb1778743.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/ec0f52c1200b42b4727f30651cb9b0a4f6e6e510.jpg",
    ],
    BarbariansAtTheGate: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/f9cb805a0a58d3b7263a63f29884b4f5076d4517.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/990ace43cfc26949b338b882d45452dbe2ff41bb.jpg",
    ],
    DiversifiedProductions: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/70959dc5c62be3b4f81e552d137bc4a9e57ca859.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/f4e1577e9ceabe0c4ce14cd262ca44fedc2f63ae.jpg",
    ],
    RealEstateTycoon: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/c6cf6fdee40746f5c81af56052a917b2597cb893.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/7e601758c086c74203e3cc0feee91db8352cc881.jpg",
    ],
    GreenPeacekeeper: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/895220d4d06e49d1f74876bcf3f7e29b7fa527d1.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/a8c68fe575777f571dae8dd25e4790fe3a73de62.jpg",
    ],
    DotComTycoon: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/2e950b97e1f92a2eceff49ccb0f4b9944ac73c16.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/eb63b7146c5e1981c4fc2825fce877de20e7e721.jpg",
    ],
    SanJose100: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/77944280de521d1e9b1dafc44d0f257b74c978f1.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/187fb9f6b107777cc68101f78d53aae4b3e4c35e.jpg",
    ],
    SanJose500: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/8ba1265063d9e74d619086d79ff9c0e8d75a835c.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/76d9c561fe2a238acdb278c9731756ea4b241e07.jpg",
    ],
    SanJose1000: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/7f00affb300b920c9e6fa2a7d3c23a9369481af1.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/f75a5a6c382286d392b8555ee84c822bc5382224.jpg",
    ],
    CrowdfundingTycoon: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/4cdda120c00780f0d2c8461457a6aa8e21512132.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/b707a7885dbca9f82518b94f6f54308ed9c4923c.jpg",
    ],
    CashIsKing: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/2225b22fd8790be3566246cee78c63b10a8e85c7.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/8f9104f50dcc506255b5b3ac6541837d03544ae0.jpg",
    ],
    PowerTycoon: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/4ac64e09d955f1b3be2c8c686e6914e96801f37c.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/08d7e2806d700d322448d51946ba76c2ad385251.jpg",
    ],
    Istanbul100: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/86e4bb6484a76f98b45dcd41be7c925d5e89cb4a.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/7b274e1d479817cb1d7b0e7a06c66d7a288e32c7.jpg",
    ],
    Istanbul500: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/e8b010d564713666dfc4c1de9b5f2391847ed55b.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/3bbaffa7bc432aec39493c690ed796af49fabbe8.jpg",
    ],
    Istanbul1000: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/367bf34a8f3a0b89985fc5bd6bae2855c3b28c1f.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/f2b4246d2b4bcc4db497b94cdd6384dabcaa11a5.jpg",
    ],
    Perth100: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/bad8b83c5d2bbb4ecf4083cd9d528a4d9e585a4f.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/7a1bda9ca354c30a761a89e4921aaa0704e7a62c.jpg",
    ],
    Perth500: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/081386426f7dbf2e2fdb6e862d352d0b4a01673d.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/67cc7b3906d40414d7b4d545235f5c3121ad2d38.jpg",
    ],
    Perth1000: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/c169c880c0455d739b57b80e4567e4d09abc1d84.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/5a46be5eb852ce372f6b41db71e0a801c3879b20.jpg",
    ],
    KansasCity100: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/907964b807f5dcd557c26fb9881fed9a836bf00b.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/bc686f53072e975729306891995a978ba7e2317c.jpg",
    ],
    KansasCity500: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/d7e98d1e784981b72da03b3ac8c4b044c00d273e.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/309b6377d5829279526082c1978181553f16285a.jpg",
    ],
    KansasCity1000: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/40acade1ea38f4aa83af005996067b4ec7088b20.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/386f8a27091cb8f0007d157d286e74f605edc9d7.jpg",
    ],
    RioDeJaneiro100: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/0406ce04473b18a7dcd058103fc63c2e918ceb0d.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/a12190621cdeb6d68f16c03b0bd44fb70fde5b7c.jpg",
    ],
    RioDeJaneiro500: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/d94529eb426741e1da2fbc52430a4d40f7526f65.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/8526f12215fba05284f88a4fdee087f510511160.jpg",
    ],
    RioDeJaneiro1000: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/2eb328fd8cee9b8d58cf3e6f87d27b56d613795c.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/587289e40a964fb083d5629021f18ff4e1660fa4.jpg",
    ],
    RandomIsland100: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/7624974dbb069808e710cc91a4b1b815630c477f.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/1eaf8351136a351b04615f5dae52c446e4145ff3.jpg",
    ],
    RandomIsland500: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/e00bc602128ae0fc3f1b0ceaf2b7be38dfec3b17.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/a42b0dd250652dfbd64556a14cce90d42e22f28d.jpg",
    ],
    RandomIsland1000: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/d1ac6b80f7adbb152bf075ee7a7b41aec008198b.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/67c5ea8f57c2dc8a7e4bae70b9dbf64f48277433.jpg",
    ],
    FishPond200: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/a8c4b2a88a2ca36003d0a6c932e0504d9a5e20a5.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/ae6056bce8469e93a1d16d692fc6d17603250ab8.jpg",
    ],
    Auckland100: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/ef43bfb4b790668f53797f707bd123e3d02cf587.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/00fcd9ebdebd168654d461ca229c5158758aedd8.jpg",
    ],
    Auckland500: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/b30bde132ee2d378f135315d83dd855f2c227c44.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/eb25f2dc5cf91be3251ae935a550b33836389824.jpg",
    ],
    Auckland1000: [
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/8ee53414eab354fb1c2e8c5c159d458cf752586b.jpg",
        "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/1574000/5de1f6b42f491c0e86a21ba616a16185292ac0d1.jpg",
    ],
};
