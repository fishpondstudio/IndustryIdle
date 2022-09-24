// tslint:disable: variable-name

import { D, DLC, DownloadableContent } from "../General/GameData";
import { forEach, NOOP } from "../General/Helper";
import { t } from "../General/i18n";
import { ResourceNumberMap } from "./Buildings/BuildingDefinitions";
import { BLD, CROP, isChristmas, isHalloween, isLunarNewYear, MAP, RES, scaleProduction } from "./Logic/Logic";
import { Resources } from "./ResourceDefinitions";

export class Policy {
    IronMine2xOutput: IPolicy = {
        name: () => t("IronMine2xOutput"),
        desc: () => t("IronMine2xOutputDesc"),
        cost: 2,
        tick: () => {
            scaleProduction("IronMine", ["staticOutput"], 2);
            RES.Fe.fuelCost *= 2;
        },
    };
    SiliconMine2xOutput: IPolicy = {
        name: () => t("SiliconMine2xOutput"),
        desc: () => t("SiliconMine2xOutputDesc"),
        cost: 2,
        tick: () => {
            scaleProduction("SiliconMine", ["staticOutput"], 2);
            BLD.SiliconMine.power *= 1.5;
            RES.Si.fuelCost *= 1.5;
        },
    };
    CoalMine2xOutput: IPolicy = {
        name: () => t("CoalMine2xOutput"),
        desc: () => t("CoalMine2xOutputDesc"),
        cost: 2,
        tick: () => {
            scaleProduction("CoalMine", ["staticOutput"], 2);
            BLD.CoalMine.power *= 1.5;
            RES.Coal.fuelCost *= 1.5;
        },
    };
    AlMine2xOutput: IPolicy = {
        name: () => t("AlMine2xOutput"),
        desc: () => t("AlMine2xOutputDesc"),
        cost: 2,
        tick: () => {
            scaleProduction("AluminumMine", ["staticOutput"], 2);
            BLD.AluminumMine.power *= 2;
        },
    };
    LoggingCamp2xOutput: IPolicy = {
        name: () => t("LoggingCamp2xOutput"),
        desc: () => t("LoggingCamp2xOutputDesc"),
        cost: 2,
        tick: () => {
            scaleProduction("LoggingCamp", ["staticOutput"], 2);
            RES.Wood.fuelCost *= 2;
        },
    };
    OilWellPowerUp: IPolicy = {
        name: () => t("PolicyOilWellPowerx2"),
        desc: () => t("PolicyOilWellPowerx2Desc"),
        cost: 2,
        tick: () => {
            BLD.OilWell.staticOutput.Oil *= 2;
            BLD.OilWell.power *= 2;
        },
    };
    HalfTransportSpeed: IPolicy = {
        name: () => t("HalfTransportSpeed"),
        desc: () => t("HalfTransportSpeedDesc"),
        cost: 2,
        tick: NOOP,
        dlc: DLC[0],
    };
    RefineryMoreOil: IPolicy = {
        name: () => t("RefineryMoreOil"),
        desc: () => t("RefineryMoreOilDesc"),
        cost: 1,
        tick: () => {
            BLD.OilRefinery.staticOutput.Petrol *= 1.5;
            BLD.OilRefinery.staticOutput.Pla *= 0.5;
        },
    };
    RefineryMorePlastic: IPolicy = {
        name: () => t("RefineryMorePlastic"),
        desc: () => t("RefineryMorePlasticDesc"),
        cost: 1,
        tick: () => {
            BLD.OilRefinery.staticOutput.Pla *= 1.5;
            BLD.OilRefinery.staticOutput.Petrol *= 0.5;
        },
    };
    FreeOilTransport: IPolicy = {
        name: () => t("FreeOilTransportV2"),
        desc: () => t("FreeOilTransportDesc"),
        cost: 2,
        tick: () => {
            BLD.OilWell.power *= 2;
            RES.Oil.fuelCost = 0;
        },
    };
    PlasticFiber: IPolicy = {
        name: () => t("PlasticFiber"),
        desc: () => t("PlasticFiberDesc"),
        cost: 1,
        tick: () => {
            BLD.FiberFactory.staticInput.Pla *= 1.5;
            BLD.FiberFactory.staticInput.Glass *= 0.5;
        },
    };
    NewsEffectx2: IPolicy = {
        name: () => t("NewsEffectx2V2"),
        desc: () => t("NewsEffectx2DescV2"),
        cost: 2,
        dlc: DLC[0],
        tick: NOOP,
    };
    AlSemiconductor: IPolicy = {
        name: () => t("AlSemiconductor"),
        desc: () => t("AlSemiconductorDesc"),
        cost: 1,
        tick: () => {
            BLD.CircuitFoundry.staticInput.Al = BLD.CircuitFoundry.staticInput.Cu;
            delete BLD.CircuitFoundry.staticInput.Cu;
        },
    };
    SuperSteelMill: IPolicy = {
        name: () => t("SuperSteelMill"),
        desc: () => t("SuperSteelMillDesc"),
        cost: 1,
        tick: () => {
            BLD.SteelMill.staticInput.Coal *= 0.5;
            BLD.SteelMill.staticInput.Fe *= 1.25;
            BLD.SteelMill.power *= 1.25;
        },
    };
    SteelMillx2: IPolicy = {
        name: () => t("SteelMillx2"),
        desc: () => t("SteelMillx2Desc"),
        cost: 2,
        tick: () => {
            scaleProduction("StainlessSteelPlant", ["staticInput", "staticOutput"], 2);
            BLD.StainlessSteelPlant.power *= 2;
            scaleProduction("SteelMill", ["staticInput", "staticOutput"], 2);
            BLD.SteelMill.power *= 2;
        },
    };
    BlackGlass: IPolicy = {
        name: () => t("GlassUseCoal"),
        desc: () => t("GlassUseCoalDesc"),
        cost: 1,
        tick: () => {
            BLD.GlassFactory.staticInput.Coal *= 1.5;
            BLD.GlassFactory.staticInput.Si *= 0.5;
        },
    };
    ResourceBoosterSquare: IPolicy = {
        name: () => t("ResourceBoosterSquare"),
        desc: () => t("ResourceBoosterSquareDesc"),
        cost: 2,
        available: () => MAP[D.map].gridType === "square",
        tick: NOOP,
    };
    WarehouseBuildingPermitSave: IPolicy = {
        name: () => t("WarehouseBuildingPermitSave"),
        desc: () => t("WarehouseBuildingPermitSaveDesc"),
        cost: 2,
        tick: NOOP,
        dlc: DLC[0],
    };
    HighSpeedWarehouse: IPolicy = {
        name: () => t("HighSpeedWarehouse"),
        desc: () => t("HighSpeedWarehouseDesc"),
        cost: 2,
        tick: NOOP,
        dlc: DLC[0],
    };
    SolarPanelAlwaysWork: IPolicy = {
        name: () => t("SolarPanelAlwaysWork"),
        desc: () => t("SolarPanelAlwaysWorkDesc"),
        cost: 2,
        tick: NOOP,
        dlc: DLC[0],
    };
    WindTurbineAlwaysWork: IPolicy = {
        name: () => t("WindTurbineAlwaysWork"),
        desc: () => t("WindTurbineAlwaysWorkDesc"),
        cost: 2,
        tick: NOOP,
        dlc: DLC[0],
    };
    DoubleTileModifier: IPolicy = {
        name: () => t("DoubleTileModifier"),
        desc: () => t("DoubleTileModifierDescV2"),
        cost: 2,
        tick: NOOP,
        dlc: DLC[0],
        onToggle: (active) => {
            if (active) {
                D.policies.NoTileModifier.active = false;
            }
        },
    };
    NoTileModifier: IPolicy = {
        name: () => t("NoTileModifier"),
        desc: () => t("NoTileModifierDesc"),
        cost: 2,
        tick: NOOP,
        onToggle: (active) => {
            if (active) {
                D.policies.DoubleTileModifier.active = false;
                D.policies.TileModifierOutputOnly.active = false;
            }
        },
    };
    TileModifierOutputOnly: IPolicy = {
        name: () => t("TileModifierOutputOnly"),
        desc: () => t("TileModifierOutputOnlyDescV2"),
        cost: 4,
        tick: NOOP,
        onToggle: (active) => {
            if (active) {
                D.policies.NoTileModifier.active = false;
            }
        },
    };
    WholesaleCenterProducingOnly: IPolicy = {
        name: () => t("WholesaleCenterProducingOnly"),
        desc: () => t("WholesaleCenterProducingOnlyDesc"),
        cost: 2,
        tick: NOOP,
    };
    ExtraPolicyPoints: IPolicy = {
        name: () => t("ExtraPolicyPoints"),
        desc: () => t("ExtraPolicyPointsDescV2"),
        cost: 2,
        tick: () => {
            scaleProduction("PolicyCenter", ["staticInput", "staticOutput"], 2);
        },
    };
    BookPublisherScience: IPolicy = {
        name: () => t("BookPublisherScience"),
        desc: () => t("BookPublisherScienceDesc"),
        cost: 2,
        tick: () => {
            BLD.BookPublisher.staticOutput.Sci = BLD.BookPublisher.staticOutput.Cul;
            delete BLD.BookPublisher.staticOutput.Cul;
        },
    };
    CrAlloyUseFe: IPolicy = {
        name: () => t("CrAlloyUseFe"),
        desc: () => t("CrAlloyUseFeDesc"),
        cost: 1,
        tick: () => {
            BLD.ChromiumAlloyPlant.staticInput.Fe = BLD.ChromiumAlloyPlant.staticInput.Li * 2;
            delete BLD.ChromiumAlloyPlant.staticInput.Li;
        },
    };
    CoalPlantFuel: IPolicy = {
        name: () => t("CoalPlantFuel"),
        desc: () => t("CoalPlantFuelDesc"),
        cost: 1,
        tick: () => {
            BLD.CoalPowerPlant.staticInput.Coal += 2;
            BLD.CoalPowerPlant.staticOutput.Petrol = 1;
        },
    };
    FuelDynamite: IPolicy = {
        name: () => t("FuelDynamite"),
        desc: () => t("FuelDynamiteDesc"),
        cost: 1,
        tick: () => {
            BLD.DynamiteFactory.staticInput[D.fuelResType] = BLD.DynamiteFactory.staticInput.Oil;
            delete BLD.DynamiteFactory.staticInput.Oil;
        },
    };
    GasPlantPetrol: IPolicy = {
        name: () => t("GasPlantPetrol"),
        desc: () => t("GasPlantPetrolDesc"),
        cost: 1,
        tick: () => {
            BLD.GasPowerPlant.staticInput.Gas += 2;
            BLD.GasPowerPlant.staticOutput.Petrol = 1;
        },
    };
    CostSaver: IPolicy = {
        name: () => t("CostSaver"),
        desc: () => t("CostSaverDesc"),
        cost: 1,
        tick: NOOP,
        onToggle: () => {
            forEach(D.buildings, (xy, entity) => {
                entity.turnOff = false;
            });
        },
    };
    SteelScience: IPolicy = {
        name: () => t("SteelScience"),
        desc: () => t("SteelScienceDesc"),
        cost: 1,
        tick: () => {
            scaleProduction("SteelMill", ["staticInput"], 2);
            BLD.SteelMill.staticOutput.Sci = BLD.SteelMill.staticOutput.Steel * 0.25;
        },
    };
    PowerBankMoreCapacity: IPolicy = {
        name: () => t("PowerBankMoreCapacity"),
        desc: () => t("PowerBankMoreCapacityDesc"),
        cost: 1,
        tick: NOOP,
    };
    ShoppingSpree: IPolicy = {
        name: () => t("ShoppingSpree"),
        desc: () => t("ShoppingSpreeDesc"),
        cost: 2,
        dlc: DLC[0],
        tick: NOOP,
    };
    BatteryFuelEconomy: IPolicy = {
        name: () => t("BatteryFuelEconomy"),
        desc: () => t("BatteryFuelEconomyDesc"),
        cost: 2,
        dlc: DLC[0],
        tick: NOOP,
    };
    ElectricCar: IPolicy = {
        name: () => t("ElectricCar"),
        desc: () => t("ElectricCarDesc"),
        cost: 2,
        tick: () => {
            BLD.CarFactory.staticInput.Bat =
                (BLD.CarFactory.staticInput.Petrol ?? BLD.CarFactory.staticInput.Gas) * 0.5;
            delete BLD.CarFactory.staticInput.Petrol;
        },
    };
    FreeTransportToTradeCenter: IPolicy = {
        name: () => t("FreeTransportToTradeCenter"),
        desc: () => t("FreeTransportToTradeCenterDesc"),
        cost: 4,
        available: () => D.map === "HongKong",
        tick: NOOP,
    };
    SyrupPlastic: IPolicy = {
        name: () => t("SyrupPlastic"),
        desc: () => t("SyrupPlasticDesc"),
        cost: 0,
        available: () => D.map === "Vancouver",
        tick: () => {
            forEach(BLD, (k, v) => {
                if (v.staticInput.Pla > 0) {
                    v.staticInput.MpSy = v.staticInput.Pla;
                    delete v.staticInput.Pla;
                }
            });
        },
    };
    ProductionDiversification: IPolicy = {
        name: () => t("ProductionDiversification"),
        desc: () => t("ProductionDiversificationDesc"),
        cost: 2,
        available: () => D.map === "Vancouver",
        tick: NOOP,
    };
    TaiChi10xCulture: IPolicy = {
        name: () => t("TaiChi10xCulture"),
        desc: () => t("TaiChi10xCultureDescV2"),
        cost: 2,
        available: () => D.map === "HongKong",
        tick: () => {
            RES.Kfu.fuelCost = 0;
            RES.Tai.fuelCost = 0;
            scaleProduction("MovieStudio", ["staticInput", "staticOutput"], 2);
            BLD.MovieStudio.power *= 1.5;
        },
    };
    ResourceExplorer2: IPolicy = {
        name: () => t("ResourceExplorer2"),
        desc: () => t("ResourceExplorer2DescV2"),
        cost: 2,
        tick: NOOP,
    };
    Blueprint: IPolicy = {
        name: () => t("PolicyBlueprint"),
        desc: () => t("PolicyBlueprintDesc"),
        cost: 0,
        tick: NOOP,
    };
    ResearchLabCultureInput: IPolicy = {
        name: () => t("ResearchLabCultureInput"),
        desc: () => t("ResearchLabCultureInputDesc"),
        cost: 4,
        tick: () => {
            BLD.ResearchLab.staticInput.Cul = BLD.ResearchLab.staticInput.Sci;
            BLD.ResearchLab.staticOutput.RP *= 2;
        },
    };
    GasPumpx2Output: IPolicy = {
        name: () => t("GasPumpx2Output"),
        desc: () => t("GasPumpx2OutputDesc"),
        cost: 2,
        tick: () => {
            BLD.GasPump.staticOutput.Gas *= 2;
            BLD.GasPump.power *= 2;
        },
    };
    AdjacentBonusSquare: IPolicy = {
        name: () => t("AdjacentBonusSquare"),
        desc: () => t("AdjacentBonusSquareDesc"),
        cost: 4,
        available: () => MAP[D.map].gridType === "square",
        tick: NOOP,
    };
    ResourceBoosterSupplyChain: IPolicy = {
        name: () => t("ResourceBoosterSupplyChain"),
        desc: () => t("ResourceBoosterSupplyChainDesc"),
        cost: 8,
        tick: NOOP,
    };
    AdjacentBonusOnlyOutput: IPolicy = {
        name: () => t("AdjacentBonusOnlyOutput"),
        desc: () => t("AdjacentBonusOnlyOutputDesc"),
        cost: 8,
        tick: NOOP,
    };
    PumpkinBattery: IPolicy = {
        name: () => t("PumpkinBattery"),
        desc: () => t("PumpkinBatteryDesc"),
        cost: 0,
        available: () => isHalloween(),
        tick: () => {
            forEach(BLD, (k, v) => {
                if (v.staticInput.Bat > 0) {
                    v.staticInput.Pmpk = v.staticInput.Bat;
                    delete v.staticInput.Bat;
                }
            });
        },
    };
    PumpkinSteel: IPolicy = {
        name: () => t("PumpkinSteel"),
        desc: () => t("PumpkinSteelDesc"),
        cost: 0,
        available: () => isHalloween(),
        tick: () => {
            forEach(BLD, (k, v) => {
                if (v.staticInput.Steel > 0) {
                    v.staticInput.Pmpk = v.staticInput.Steel;
                    delete v.staticInput.Steel;
                }
            });
        },
    };
    ReindeerSilicon: IPolicy = {
        name: () => t("ReindeerSilicon"),
        desc: () => t("ReindeerSiliconDesc"),
        cost: 0,
        available: () => isChristmas(),
        tick: () => {
            forEach(BLD, (k, v) => {
                if (v.staticInput.Si > 0) {
                    v.staticInput.Rndr = v.staticInput.Si;
                    delete v.staticInput.Si;
                }
            });
        },
    };
    ReindeerAluminum: IPolicy = {
        name: () => t("ReindeerAluminum"),
        desc: () => t("ReindeerAluminumDesc"),
        cost: 0,
        available: () => isChristmas(),
        tick: () => {
            forEach(BLD, (k, v) => {
                if (v.staticInput.Al > 0) {
                    v.staticInput.Rndr = v.staticInput.Al;
                    delete v.staticInput.Al;
                }
            });
        },
    };
    SantaClauseIsComing: IPolicy = {
        name: () => t("SantaClauseIsComing"),
        desc: () => t("SantaClauseIsComingDesc"),
        cost: 0,
        available: () => isChristmas(),
        tick: () => {
            const scaler = BLD.SantaFactory.staticInput.Toy / 2;
            BLD.SantaFactory.staticInput = { Toy: scaler, Rndr: 3 * scaler };
            BLD.SantaFactory.staticOutput = { Santa: 1, Cul: 1, Sci: 1 };
            BLD.ToyFactory.staticOutput.Rndr = 1;
        },
    };
    LunarNewYear: IPolicy = {
        name: () => t("LunarNewYear22"),
        desc: () => t("LunarNewYear22Desc"),
        cost: 0,
        available: () => isLunarNewYear(),
        tick: () => {
            forEach(BLD, (k, v) => {
                if (replaceResource(v.staticInput, "Paper", "Ltrn")) {
                    scaleProduction(k, ["staticInput", "staticOutput"], 2);
                }
            });
            BLD.PaperMill.name = () => t("PaperAcademy");
            BLD.PaperMill.staticInput = { Wood: 15 };
            BLD.PaperMill.staticOutput = { Cul: 1 };
        },
    };
    MetaRebranding: IPolicy = {
        name: () => t("MetaRebranding"),
        desc: () => t("MetaRebrandingDesc"),
        cost: 1,
        tick: () => {
            const scaler = BLD.SocialNetworkInc.staticInput.WWW;
            BLD.SocialNetworkInc.staticInput = {
                WWW: scaler,
                Game: 5 * scaler,
                SuCp: 10 * scaler,
                Bit: 10 * scaler,
                Doge: 10 * scaler,
            };
            BLD.SocialNetworkInc.name = () => t("MetaInc");
        },
    };
    AdjacentExplorer: IPolicy = {
        name: () => t("AdjacentExplorer"),
        desc: () => t("AdjacentExplorerDesc"),
        cost: 0,
        available: () => D.map === "Perth",
        tick: NOOP,
    };
    FactoryMining: IPolicy = {
        name: () => t("FactoryMining"),
        desc: () => t("FactoryMiningDesc"),
        cost: 0,
        available: () => D.map === "Perth",
        tick: NOOP,
    };
    RiceFlour: IPolicy = {
        name: () => t("RiceFlour"),
        desc: () => t("RiceFlourDesc"),
        cost: 1,
        dlc: DLC[1],
        tick: () => {
            BLD.FlourMill.staticInput.Rice = BLD.FlourMill.staticInput.Wheat;
            delete BLD.FlourMill.staticInput.Wheat;
        },
    };
    CornSyrup: IPolicy = {
        name: () => t("CornSyrup"),
        desc: () => t("CornSyrupDesc"),
        cost: 1,
        dlc: DLC[1],
        tick: () => {
            BLD.SugarRefinery.staticInput = BLD._CornSyrup.staticInput;
        },
    };
    IndustryZoneProductivityBoost: IPolicy = {
        name: () => t("IndustryZoneProductivityBoost"),
        desc: () => t("IndustryZoneProductivityBoostDesc"),
        cost: 4,
        dlc: DLC[1],
        tick: NOOP,
    };
    MineBooster: IPolicy = {
        name: () => t("MineBooster"),
        desc: () => t("MineBoosterDesc"),
        cost: 0,
        dlc: DLC[1],
        available: () => D.map === "Auckland",
        tick: NOOP,
    };
    ElectricFishPond: IPolicy = {
        name: () => t("ElectricFishPond"),
        desc: () => t("ElectricFishPondDesc"),
        cost: 0,
        dlc: DLC[1],
        available: () => D.map === "Auckland",
        tick: NOOP,
    };
    HydroFarming: IPolicy = {
        name: () => t("HydroFarming"),
        desc: () => t("HydroFarmingDesc"),
        cost: 0,
        dlc: DLC[1],
        available: () => D.map === "Auckland",
        tick: NOOP,
    };
    CropOutputx2: IPolicy = {
        name: () => t("CropOutputx2"),
        desc: () => t("CropOutputx2Desc"),
        cost: 2,
        dlc: DLC[1],
        tick: () => {
            forEach(CROP, (k) => {
                RES[k].fuelCost *= 2;
            });
            forEach(BLD, (k) => {
                forEach(BLD[k].staticInput, (r) => {
                    if (CROP[r]) {
                        BLD[k].staticInput[r] *= 2;
                    }
                });
            });
        },
    };
    MeatProductionx2: IPolicy = {
        name: () => t("MeatProductionx2"),
        desc: () => t("MeatProductionx2Desc"),
        cost: 4,
        dlc: DLC[1],
        tick: () => {
            scaleProduction("PigFarm", ["staticInput", "staticOutput"], 2);
            BLD.PigFarm.power *= 2;
            scaleProduction("CowFarm", ["staticInput", "staticOutput"], 2);
            BLD.CowFarm.power *= 2;
            scaleProduction("ChickenFarm", ["staticInput", "staticOutput"], 2);
            BLD.ChickenFarm.power *= 2;
            scaleProduction("FishPond", ["staticInput", "staticOutput"], 2);
            BLD.FishPond.power *= 2;
            scaleProduction("FodderFactory", ["staticInput", "staticOutput"], 2);
            BLD.FodderFactory.power *= 2;
        },
    };
    WaterProductionx2: IPolicy = {
        name: () => t("WaterProductionx2"),
        desc: () => t("WaterProductionx2Desc"),
        cost: 2,
        dlc: DLC[1],
        tick: () => {
            scaleProduction("WaterPump", ["staticOutput"], 2);
            BLD.WaterPump.power *= 2;
        },
    };
}

export interface IPolicy {
    name: () => string;
    desc: () => string;
    cost: number;
    dlc?: DownloadableContent;
    tick: () => void;
    available?: () => boolean;
    onToggle?: (active: boolean) => void;
}

export function replaceResource(io: ResourceNumberMap, oldRes: keyof Resources, newRes: keyof Resources): boolean {
    if (!io[oldRes]) {
        return false;
    }
    io[newRes] = io[oldRes];
    delete io[oldRes];
    return true;
}
