import { eCDF } from "../General/eCDF";
import { D, DLC, DownloadableContent, G } from "../General/GameData";
import { extrapolate, forEach, hashCode, keysOf, MINUTE, NOOP, randOne, sizeOf, srand } from "../General/Helper";
import { t } from "../General/i18n";
import { noiseSeed, perlinNoise } from "../General/Perlin";
import { Buildings } from "./Buildings/BuildingDefinitions";
import { gridToString, stringToGrid } from "./GridHelper";
import { makeEntity } from "./Logic/Entity";
import { findByType, findClosestDeposit, findClosestEmpty } from "./Logic/Find";
import { BLD, CROP, Crop, Deposit, MAP, POLICY, RES, scaleProduction } from "./Logic/Logic";
import { AucklandTiles } from "./MapData";
import { addBuilding } from "./RunMigration";

type GridType = "square" | "hex";

export interface IMap {
    name: () => string;
    gridType: GridType;
    deposits: Partial<Record<Deposit, number>>;
    crops: Partial<Record<Crop, true>>;
    size: number;
    resourceProbability: number;
    resourceTiles?: Record<string, true>;
    bonus: () => string;
    tick: () => void;
    dlc?: DownloadableContent;
    tileNoise?: (seed: string) => Record<string, number>;
    setup: () => void;
    south?: boolean;
}

export class Maps {
    Stockholm: IMap = {
        name: () => t("Stockholm"),
        gridType: "square",
        deposits: Object.assign({ Fe: 1, Al: 1, Si: 1, Wood: 1, Coal: 1 }, { Oil: 1 }, { Cu: 1 }),
        crops: {
            Rice: true,
            Corn: true,
            Soy: true,
        },
        resourceProbability: 0.25,
        size: 50,
        bonus: () => t("StockholmBonusV2"),
        setup: () => {
            D.unlockedBuildings.PaperMill = true;
            D.unlockedBuildings.OilRefinery = true;
        },
        tick: () => {
            scaleProduction("PaperMill", ["staticInput", "staticOutput"], 2);
            scaleProduction("CircuitFoundry", ["staticOutput"], 2);
            POLICY.BookPublisherScience.cost = 0;
            scaleProduction("LoggingCamp", ["staticOutput"], 2);
        },
    };
    Oslo: IMap = {
        name: () => t("Oslo"),
        gridType: "square",
        deposits: Object.assign({ Fe: 2, Coal: 1, Al: 2, Wood: 2, Si: 2 }, { Oil: 10, Gas: 5 }),
        crops: {
            Rice: true,
            Corn: true,
            Soy: true,
        },
        resourceProbability: 0.3,
        bonus: () => t("OsloBonusV3"),
        size: 50,
        setup: setupTutorial,
        tick: () => {
            scaleProduction("GasProcessingPlant", ["staticInput", "staticOutput"], 2);
            scaleProduction("OilRefinery", ["staticInput", "staticOutput"], 2);
            POLICY.FreeOilTransport.cost = 0;
        },
    };
    Rotterdam: IMap = {
        name: () => t("Rotterdam"),
        gridType: "hex",
        deposits: Object.assign({ Fe: 10, Coal: 5, Al: 4, Si: 2, Wood: 2 }, { Gas: 5 }, { Cr: 1 }),
        crops: {
            Rice: true,
            Corn: true,
            Soy: true,
        },
        resourceProbability: 0.25,
        bonus: () => t("RotterdamBonusV2"),
        size: 50,
        setup: () => {
            D.autoSellPerSec *= 2;
        },
        tick: () => {
            POLICY.NoTileModifier.cost = 0;
            scaleProduction("SteelMill", ["staticInput", "staticOutput"], 2);
            scaleProduction("StainlessSteelPlant", ["staticInput", "staticOutput"], 2);
            RES.Steel.fuelCost *= 0.5;
            RES.Fe.fuelCost = 0;
            BLD.WindTurbine.power *= 2;
        },
    };
    StPetersburg: IMap = {
        name: () => t("StPetersburg"),
        gridType: "square",
        deposits: Object.assign({ Fe: 5, Al: 4, Si: 4, Coal: 2, Wood: 2 }, { Oil: 4 }, { U: 1 }),
        crops: {
            Rice: true,
            Corn: true,
            Soy: true,
        },
        resourceProbability: 0.2,
        bonus: () => t("StPetersburgBonusV2"),
        size: 100,
        setup: () => {
            D.unlockedBuildings.OilRefinery = true;
        },
        tick: () => {
            RES.U.fuelCost *= 0.5;
            scaleProduction("UraniumMine", ["staticInput", "staticOutput"], 2);
            scaleProduction("UraniumEnrichmentPlant", ["staticInput", "staticOutput"], 2);
            scaleProduction("ProjectVostok", ["staticInput", "staticOutput"], 2);
            RES.Gun.fuelCost = 0;
        },
    };
    Detroit: IMap = {
        name: () => t("Detroit"),
        gridType: "hex",
        deposits: Object.assign({ Al: 2, Fe: 2, Si: 2, Coal: 2, Wood: 2 }, { Gas: 2 }, { Li: 1, Ti: 1 }),
        crops: {
            Rice: true,
            Corn: true,
            Soy: true,
        },
        resourceProbability: 0.2,
        bonus: () => t("DetroitBonusV3"),
        size: 50,
        setup: () => {
            D.unlockedBuildings.EngineFactory = true;
        },
        tick: () => {
            scaleProduction("CarFactory", ["staticInput", "staticOutput"], 2);
            scaleProduction("EngineFactory", ["staticOutput"], 2);
            scaleProduction("TrainFactory", ["staticOutput", "staticOutput"], 2);
            RES.Car.fuelCost = 0;
            BLD.CarFactory.staticInput.Gas = BLD.CarFactory.staticInput.Petrol;
            delete BLD.CarFactory.staticInput.Petrol;
            POLICY.ElectricCar.cost = 0;
        },
    };
    Rome: IMap = {
        name: () => t("Rome"),
        gridType: "hex",
        deposits: Object.assign({ Fe: 5, Si: 5, Coal: 5, Al: 2, Wood: 2 }, { Gas: 2 }, { Cr: 1, Ti: 1 }),
        crops: {
            Rice: true,
            Corn: true,
            Soy: true,
        },
        resourceProbability: 0.2,
        bonus: () => t("RomeBonus"),
        size: 75,
        setup: () => {
            D.unlockedBuildings.Colosseum = true;
            findByType("PolicyCenter").level = 5;
        },
        tick: () => {
            scaleProduction("Colosseum", ["staticOutput"], 2);
            scaleProduction("OperaHouse", ["staticInput", "staticOutput"], 2);
            BLD.RecordingStudio.staticOutput.Cul = 1;
        },
    };
    ////////////////////////////////////// Premium Maps //////////////////////////////////////
    Toulouse: IMap = {
        name: () => t("Toulouse"),
        gridType: "hex",
        deposits: Object.assign({ Fe: 4, Si: 4, Coal: 4, Al: 2, Wood: 2 }, { Oil: 2 }, { Ti: 1, U: 1 }),
        crops: {
            Rice: true,
            Corn: true,
            Soy: true,
        },
        resourceProbability: 0.3,
        bonus: () => t("ToulouseBonusV2"),
        size: 50,
        dlc: DLC[0],
        setup: () => {
            D.unlockedBuildings.OilRefinery = true;
        },
        tick: () => {
            scaleProduction("TitaniumMine", ["staticInput", "staticOutput"], 2);
            scaleProduction("UraniumEnrichmentPlant", ["staticOutput"], 2);
            scaleProduction("AircraftFactory", ["staticOutput"], 2);
            scaleProduction("JetEngineFactory", ["staticInput", "staticOutput"], 2);
            scaleProduction("RocketFactory", ["staticInput", "staticOutput"], 2);
        },
    };
    Hamburg: IMap = {
        name: () => t("Hamburg"),
        gridType: "hex",
        deposits: Object.assign({ Al: 4, Fe: 4, Si: 2, Coal: 2, Wood: 2 }, { Oil: 2 }, { Li: 1, Cu: 1 }),
        crops: {
            Rice: true,
            Corn: true,
            Soy: true,
        },
        resourceProbability: 0.3,
        bonus: () => t("HamburgBonus"),
        size: 100,
        dlc: DLC[0],
        setup: () => {
            D.unlockedBuildings.OilRefinery = true;
            D.unlockedBuildings.ZeppelinFactory = true;
            D.unlockedBuildings.LiionBatteryFactory = true;
        },
        tick: () => {
            scaleProduction("Shipyard", ["staticInput", "staticOutput"], 2);
            scaleProduction("SemiconductorFactory", ["staticOutput"], 2);
            scaleProduction("CarFactory", ["staticInput", "staticOutput"], 2);
        },
    };
    Boston: IMap = {
        name: () => t("Boston"),
        gridType: "square",
        deposits: Object.assign({ Fe: 2, Si: 5, Coal: 2, Al: 2, Wood: 5 }, { Gas: 2, Oil: 2 }, { Ti: 1 }),
        crops: {
            Rice: true,
            Corn: true,
            Soy: true,
        },
        resourceProbability: 0.25,
        bonus: () => t("BostonBonus"),
        size: 75,
        dlc: DLC[0],
        setup: () => {
            D.unlockedBuildings.Polytechnic = true;
            findByType("ResearchLab").level = 5;
        },
        tick: () => {
            scaleProduction("Polytechnic", ["staticInput", "staticOutput"], 2);
            scaleProduction("School", ["staticInput", "staticOutput"], 2);
            scaleProduction("University", ["staticOutput"], 2);
        },
    };
    Osaka: IMap = {
        name: () => t("Osaka"),
        gridType: "hex",
        deposits: Object.assign({ Fe: 2, Si: 2, Coal: 2, Al: 2, Wood: 2 }, {}, { Li: 1, Ti: 1, Cu: 1 }),
        crops: {
            Rice: true,
            Corn: true,
            Soy: true,
        },
        resourceProbability: 0.2,
        bonus: () => t("OsakaBonus"),
        size: 100,
        dlc: DLC[0],
        tileNoise: _perlin,
        setup: () => {
            findByType("TradeCenter").resources.Bat = 1e5;
            D.unlockedBuildings.BatteryFactory = true;
        },
        tick: () => {
            delete BLD.BatteryFactory.staticInput.Coal;
            scaleProduction("LiionBatteryFactory", ["staticInput", "staticOutput"], 2);
            scaleProduction("BatteryFactory", ["staticInput", "staticOutput"], 2);
            scaleProduction("SemiconductorFactory", ["staticOutput"], 2);
        },
    };
    HongKong: IMap = {
        name: () => t("HongKong"),
        gridType: "hex",
        deposits: Object.assign({ Fe: 1, Si: 1, Coal: 1, Al: 1, Wood: 1 }, { Oil: 1, Gas: 1 }, {}),
        crops: {
            Rice: true,
            Corn: true,
            Soy: true,
        },
        resourceProbability: 0.15,
        bonus: () => t("HongKongBonusV2"),
        size: 50,
        dlc: DLC[0],
        setup: () => {
            findByType("TradeCenter").resources.Cash = 1e8;
            D.autoSellConcurrency++;
        },
        tick: NOOP,
    };
    Vancouver: IMap = {
        name: () => t("Vancouver"),
        gridType: "square",
        deposits: Object.assign({ Fe: 1, Si: 1, Coal: 1, Al: 1, Wood: 2 }, { Oil: 1 }, { U: 2, Li: 1 }),
        crops: {
            Rice: true,
            Corn: true,
            Soy: true,
        },
        resourceProbability: 0.25,
        bonus: () => t("VancouverBonus"),
        size: 75,
        dlc: DLC[0],
        setup: () => {
            D.unlockedBuildings.OilRefinery = true;
        },
        tick: () => {
            scaleProduction("ToyFactory", ["staticOutput"], 2);
            scaleProduction("GameStudio", ["staticInput", "staticOutput"], 2);
        },
    };
    SanJose: IMap = {
        name: () => t("SanJose"),
        gridType: "hex",
        deposits: Object.assign({ Fe: 1, Si: 2, Coal: 1, Al: 1, Wood: 1 }, { Gas: 1 }, { Ti: 1, Cu: 2 }),
        crops: {
            Rice: true,
            Corn: true,
            Soy: true,
        },
        resourceProbability: 0.3,
        bonus: () => t("SanJoseBonus"),
        size: 100,
        dlc: DLC[0],
        setup: () => {
            D.swissBoosts.industryZoneCapacityBooster = 1;
        },
        tick: () => {
            forEach(BLD, (k, v) => {
                if (v.staticInput.WWW > 0 || v.staticOutput.WWW > 0) {
                    scaleProduction(k, ["staticInput", "staticOutput"], 2);
                }
            });
            BLD.SolarPanel.power *= 2;
            scaleProduction("SiliconMine", ["staticOutput"], 2);
        },
    };
    RandomIsland: IMap = {
        name: () => t("RandomIsland"),
        gridType: "hex",
        deposits: Object.assign(
            { Fe: 1, Si: 1, Coal: 1, Al: 1, Wood: 1 },
            { Gas: 1, Oil: 1 },
            { Ti: 1, Cu: 1, U: 1, Li: 1, Cr: 1 }
        ),
        crops: {},
        resourceProbability: 0.25,
        bonus: () => t("RandomIslandBonus"),
        size: 50,
        dlc: DLC[1],
        setup: NOOP,
        tick: () => {
            getRandomIslandBonusBuildings().forEach((b, i) => {
                if (i <= 1) {
                    scaleProduction(b, ["staticInput", "staticOutput"], 2);
                } else {
                    scaleProduction(b, ["staticOutput"], 2);
                }
            });
        },
    };
    Perth: IMap = {
        name: () => t("Perth"),
        gridType: "square",
        deposits: Object.assign({ Fe: 5, Si: 1, Coal: 1, Al: 1, Wood: 1 }, { Oil: 1 }, { Ti: 1, GV: 1 }),
        crops: {
            Rice: true,
            Corn: true,
            Soy: true,
            Sgcn: true,
        },
        resourceProbability: 0.35,
        bonus: () => t("PerthBonus"),
        size: 50,
        dlc: DLC[1],
        setup: () => {
            D.unlockedBuildings.OilRefinery = true;
        },
        tick: () => {
            scaleProduction("RobotFactory", ["staticOutput"], 2);
            scaleProduction("TankFactory", ["staticInput", "staticOutput"], 2);
        },
        south: true,
    };
    KansasCity: IMap = {
        name: () => t("KansasCity"),
        gridType: "square",
        deposits: Object.assign({ Fe: 1, Si: 1, Al: 1, Coal: 2, Wood: 2 }, { Gas: 2 }, { Water: 1 }),
        crops: {
            Wheat: true,
            Corn: true,
            Soy: true,
            Vege: true,
            Sgcn: true,
        },
        resourceProbability: 0.25,
        bonus: () => t("KansasCityBonus"),
        size: 100,
        dlc: DLC[1],
        setup: () => {
            D.unlockedBuildings.FoodProcessingPlant = true;
        },
        tick: () => {
            RES.Corn.fuelCost = 0;
            scaleProduction("FastFoodChain", ["staticInput", "staticOutput"], 2);
            scaleProduction("_Corn", ["staticOutput"], 2);
            scaleProduction("_Water_Corn", ["staticOutput"], 2);
        },
    };
    RioDeJaneiro: IMap = {
        name: () => t("RioDeJaneiro"),
        gridType: "hex",
        deposits: Object.assign({ Fe: 4, Coal: 4, Wood: 4, Si: 1, Al: 1 }, { Oil: 2, Gas: 2 }, { Water: 4, U: 1 }),
        crops: {
            Wheat: true,
            Corn: true,
            Soy: true,
            Cocoa: true,
            Coffe: true,
        },
        resourceProbability: 0.25,
        bonus: () => t("RioDeJaneiroBonus"),
        size: 100,
        dlc: DLC[1],
        setup: () => {},
        tick: () => {
            BLD.ChickenFarm.staticOutput.Biofl = 1;
            BLD.CowFarm.staticOutput.Biofl = 1;
            BLD.PigFarm.staticOutput.Biofl = 1;
            scaleProduction("LoggingCamp", ["staticOutput"], 2);
            scaleProduction("LumberMill", ["staticInput", "staticOutput"], 2);
        },
        south: true,
    };
    Istanbul: IMap = {
        name: () => t("Istanbul"),
        gridType: "square",
        deposits: Object.assign({ Fe: 3, Coal: 3, Wood: 1, Si: 1, Al: 1 }, { Oil: 3 }, { Ti: 3, Cr: 1 }),
        crops: {
            Wheat: true,
            Corn: true,
            Soy: true,
            Vege: true,
        },
        resourceProbability: 0.25,
        bonus: () => t("IstanbulBonus"),
        size: 50,
        dlc: DLC[1],
        setup: () => {
            makeWormhole(0, 24, 0, 24);
            makeWormhole(0, 24, 24, 49);
            makeWormhole(24, 49, 0, 24);
            makeWormhole(24, 49, 24, 49);
            D.unlockedBuildings.OilRefinery = true;
        },
        tick: () => {
            scaleProduction("ArmyCommand", ["staticInput", "staticOutput"], 2);
            scaleProduction("TankFactory", ["staticInput", "staticOutput"], 2);
            scaleProduction("GunFactory", ["staticInput", "staticOutput"], 2);
            scaleProduction("MissileFactory", ["staticInput", "staticOutput"], 2);
            scaleProduction("DynamiteFactory", ["staticOutput"], 2);
        },
    };
    Auckland: IMap = {
        name: () => t("Auckland"),
        gridType: "hex",
        deposits: Object.assign({ Fe: 1, Coal: 1, Wood: 1, Si: 1, Al: 1 }, { Gas: 1 }, { Water: 1, U: 1 }),
        crops: {
            Rice: true,
            Corn: true,
            Cocoa: true,
            Vege: true,
        },
        resourceTiles: AucklandTiles,
        resourceProbability: sizeOf(AucklandTiles) / (50 * 50),
        bonus: () => t("AucklandBonus"),
        size: 50,
        dlc: DLC[1],
        setup: () => {},
        tick: () => {},
        south: true,
    };
}

function makeWormhole(minX: number, maxX: number, minY: number, maxY: number) {
    let xy = `${cc.randi(minX, maxX)},${cc.randi(minY, maxY)}`;
    while (G.world.depositNodes[xy] || D.buildings[xy]) {
        xy = `${cc.randi(minX, maxX)},${cc.randi(minY, maxY)}`;
    }
    D.buildings[xy] = makeEntity(xy, "Wormhole");
}

const RANDOM_ISLAND_SEED = "3fPOOoL7dA5BcQbYrFb91mGKtVLihojmAYTrKnnl";

export function generateRandomIsland() {
    const map = MAP.RandomIsland;
    const rand = srand(randomIslandSeed());
    map.gridType = randOne(["hex", "square"] as const, rand);
    map.deposits = {};
    (["Fe", "Si", "Coal", "Al", "Wood"] as const).forEach((k) => {
        map.deposits[k] = extrapolate(rand(), 1, 5);
    });
    const fuel = randOne(["Gas", "Oil"] as const, rand);
    map.deposits[fuel] = extrapolate(rand(), 1, 5);
    const rare: Deposit[] = ["Ti", "Cu", "U", "Li", "Cr"];
    rare.shuffle(rand);
    for (let i = 0; i < 3; i++) {
        map.deposits[rare[i]] = extrapolate(rand(), 1, 5);
    }
    const crops = keysOf(CROP).shuffle(rand);
    for (let i = 0; i < 3; i++) {
        map.crops[crops[i]] = true;
    }
    map.resourceProbability = extrapolate(rand(), 0.2, 0.3);
    map.size = Math.round(extrapolate(rand(), 50, 100));
}

function randomIslandSeed(): string {
    return RANDOM_ISLAND_SEED + Math.floor(D.mapCreatedAt / (MINUTE * 5));
}

export function getRandomIslandBonusBuildings(): (keyof Buildings)[] {
    const buildings = (
        [
            "LumberMill",
            "PaperMill",
            "SteelMill",
            "OilRefinery",
            "GasProcessingPlant",
            "UraniumEnrichmentPlant",
            "SemiconductorFactory",
            "CircuitFoundry",
            "PhoneFactory",
            "RobotFactory",
            "ToyFactory",
            "ShoeFactory",
            "ClothingFactory",
            "FashionFactory",
            "BatteryFactory",
            "TitaniumAlloyPlant",
            "ChromiumAlloyPlant",
            "GalvanicBatteryFactory",
            "ScreenFactory",
            "CameraFactory",
            "ComputerFactory",
            "SuperComputerLab",
            "BitcoinFarm",
            "DogecoinFarm",
            "CarFactory",
            "EngineFactory",
            "JetEngineFactory",
            "GunFactory",
            "RadarFactory",
            "ArtilleryFactory",
            "MissileFactory",
            "AtomicBombFactory",
            "NuclearMissileFactory",
            "DynamiteFactory",
            "LiquidPropellantFactory",
            "GasPropellantFactory",
            "RocketFactory",
            "SatelliteFactory",
            "SpaceshipFactory",
            "AirShuttleInc",
            "ArmyCommand",
            "SpaceStationFactory",
            "SpaceColonyInc",
            "TankFactory",
            "Shipyard",
            "AircraftFactory",
            "ZeppelinFactory",
            "VideoFarm",
            "MovieStudio",
            "GameStudio",
            "ConsoleFactory",
            "SoftwareCompany",
            "OperatingSystemCompany",
            "DatabaseCompany",
            "WebBrowser",
            "SocialNetworkInc",
            "SnapTokInc",
            "MusifyInc",
            "GlassFactory",
            "FiberFactory",
            "GuitarFactory",
            "DrumFactory",
            "School",
            "Polytechnic",
            "Colosseum",
            "BookPublisher",
            "EBookInc",
        ] as (keyof Buildings)[]
    ).shuffle(srand(randomIslandSeed()));
    const result: (keyof Buildings)[] = [];
    for (let i = 0; i < 4; i++) {
        result.push(buildings[i]);
    }
    return result;
}

function _perlin(seed: string) {
    const noises: Record<string, number> = {};
    const noisesUniform: Record<string, number> = {};
    noiseSeed(hashCode(seed));
    G.grid.forEach((k) => {
        const grid = stringToGrid(k);
        const noise = perlinNoise(grid.x / 10, grid.y / 10);
        noises[k] = noise;
    });
    const cdf = eCDF(Object.values(noises));
    forEach(noises, (k, v) => {
        noisesUniform[k] = cdf(v);
    });
    return noisesUniform;
}

export function depositsToArray(deposits: Partial<Record<Deposit, number>>): Deposit[] {
    const result: Deposit[] = [];
    forEach(deposits, (k, v) => {
        for (let i = 0; i < v; i++) {
            result.push(k);
        }
    });
    return result;
}

export function depositsToPercentage(deposits: Partial<Record<Deposit, number>>): Partial<Record<Deposit, number>> {
    const result: Partial<Record<Deposit, number>> = {};
    let length = 0;
    forEach(deposits, (k, v) => {
        length += v;
    });
    forEach(deposits, (k, v) => {
        result[k] = v / length;
    });
    return result;
}

function setupTutorial() {
    const hq = findByType("Headquarter");
    const windTurbine = findClosestEmpty(stringToGrid(hq.grid));
    if (windTurbine) {
        const b = addBuilding(gridToString(windTurbine), "WindTurbine");
        b.level = 4;
    }
    const [oil, oilGrid] = findClosestDeposit(stringToGrid(hq.grid), "Oil", false);
    if (oil) {
        const b = addBuilding(gridToString(oilGrid), "OilWell");
        b.level = 8;
    }
    const [gas, gasGrid] = findClosestDeposit(stringToGrid(hq.grid), "Gas", false);
    if (gas) {
        const b = addBuilding(gridToString(gasGrid), "GasPump");
        b.level = 2;
    }
    const oilRefinery = findClosestEmpty(oilGrid);
    if (oilRefinery) {
        const b = addBuilding(gridToString(oilRefinery), "OilRefinery");
        b.level = 2;
    }
    D.unlockedBuildings.OilRefinery = true;
    D.autoSellRes = { Pla: true };
}
