import { D, DLC, DownloadableContent, T } from "../../General/GameData";
import { NOOP, formatPercent } from "../../General/Helper";
import { t } from "../../General/i18n";
import { CentralBankPage } from "../../UI/CentralBankPage";
import { HeadquarterPage } from "../../UI/HeadquarterPage";
import { LogisticsDepartmentPage } from "../../UI/LogisticsDepartmentPage";
import { PolicyCenterPage } from "../../UI/PolicyCenterPage";
import { ResearchPage } from "../../UI/ResearchPage";
import { StatPage } from "../../UI/StatPage";
import { SwissShopPage } from "../../UI/SwissShopPage";
import { WholesaleCenterPage } from "../../UI/WholesaleCenterPage";
import { WormholePage } from "../../UI/WormholePage";
import EntityVisual from "../EntityVisual";
import { Entity, getOutput } from "../Logic/Entity";
import { Item, MAP, isBuildingLevelTooHigh, isOctober, requireDeposit } from "../Logic/Logic";
import { addBoostAmount, getGenericBoostPercentage as getBoostPercentage } from "../Logic/Production";
import { isPolicyActive } from "../Logic/SelfContained";
import { CAPACITOR_SIZE, Resources } from "../ResourceDefinitions";
import { boostAdjacentBuilding, tickGeneral, tickMine, tickMultipleRecipe, tickPowerPlant } from "./BuildingTicks";
import {
    DamDefinition,
    DefenseCommandDefinition,
    FarmlandDefinition,
    FlourMillDefinition,
    GreenhouseDefinition,
    IndustryZoneDefinition,
    PowerBankDefinition,
    ResourceBoosterDefinition,
    ResourceExplorerDefinition,
    TradeCenterDefinition,
    WarehouseDefinition,
} from "./CustomDefinitions";
import { MultipleRecipePanel } from "./MultipleRecipePanel";

export type ResourceNumberMap = Partial<Record<keyof Resources, number>>;
export type ResourceSet = Partial<Record<keyof Resources, true>>;
export type BuildingSet = Partial<Record<keyof Buildings, true>>;
export type BuildingNumberMap = Partial<Record<keyof Buildings, number>>;

export interface BuildingItem extends Item {
    staticInput: ResourceNumberMap;
    staticOutput: ResourceNumberMap;
    input?: (entity: Entity) => ResourceNumberMap;
    output?: (entity: Entity) => ResourceNumberMap;
    power: number;
    dlc?: DownloadableContent;
    tick?: (v: EntityVisual) => void;
    tickOfflineEarning?: (entity: Entity, ticks: number) => ResourceNumberMap;
    builtin?: boolean;
    panel?: () => m.Component<{ entity: Entity }>;
    page?: () => m.Component<{ entity: Entity; docked: boolean }>;
    available?: () => boolean;
    canBuildOnTile?: (xy: string) => boolean;
    buildOnTileWarning?: (xy: string) => string;
    hideUpgradeMultiplier?: true;
    research?: number;
    cost?: number;
    desc?: () => string;
    beforeRemove?: (visual: EntityVisual) => void;
    hideProfit?: boolean;
    recipes?: () => BuildingNumberMap;
    ignoreForPricing?: boolean;
    canAttack?: boolean;
}

export class Buildings {
    LumberMill: BuildingItem = {
        name: () => t("LumberMill"),
        staticInput: { Wood: 2 },
        staticOutput: { Lumb: 1 },
        power: -2,
    };
    PaperMill: BuildingItem = {
        name: () => t("PaperMill"),
        staticInput: { Wood: 2 },
        staticOutput: { Paper: 1 },
        power: -2,
    };
    SteelMill: BuildingItem = {
        name: () => t("SteelMill"),
        staticInput: { Fe: 2, Coal: 1 },
        staticOutput: { Steel: 1 },
        power: -2,
    };
    StainlessSteelPlant: BuildingItem = {
        name: () => t("StainlessSteelPlant"),
        staticInput: { Fe: 3, Cr: 1 },
        staticOutput: { Steel: 2 },
        power: -2,
        dlc: DLC[0],
    };
    OilRefinery: BuildingItem = {
        name: () => t("OilRefinery"),
        staticInput: { Oil: 2 },
        staticOutput: { Petrol: 1, Pla: 1 },
        power: -2,
    };
    CoalGasificationPlant: BuildingItem = {
        name: () => t("CoalGasificationPlant"),
        staticInput: { Coal: 2 },
        staticOutput: { Gas: 1, Pla: 1 },
        power: -2,
        dlc: DLC[0],
    };
    GasProcessingPlant: BuildingItem = {
        name: () => t("GasProcessingPlant"),
        staticInput: { Gas: 1 },
        staticOutput: { Pla: 1 },
        power: -2,
    };
    UraniumEnrichmentPlant: BuildingItem = {
        name: () => t("UraniumEnrichmentPlant"),
        staticInput: { U: 10 },
        staticOutput: { ErU: 1 },
        power: -10,
    };
    SemiconductorFactory: BuildingItem = {
        name: () => t("SemiconductorFactory"),
        staticInput: { Si: 2, Fe: 1, Coal: 1 },
        staticOutput: { Sem: 1 },
        power: -4,
    };
    CircuitFoundry: BuildingItem = {
        name: () => t("CircuitFoundry"),
        staticInput: { Sem: 2, Cu: 1 },
        staticOutput: { IC: 1 },
        power: -4,
    };
    SemiconductorFab: BuildingItem = {
        name: () => t("IntegratedCircuitFab"),
        staticInput: { Al: 4, Si: 14 },
        staticOutput: { IC: 1 },
        power: -4,
        dlc: DLC[0],
    };
    ChipManufacturer: BuildingItem = {
        name: () => t("ChipManufacturer"),
        staticInput: { Cu: 6, Si: 6, Al: 6 },
        staticOutput: { IC: 1, Sci: 1 },
        power: -4,
        available: () => D.map === "SanJose",
    };
    PhoneFactory: BuildingItem = {
        name: () => t("PhoneFactory"),
        staticInput: { Bat: 1, Al: 2, Cam: 1, Scr: 1, IC: 2, Pla: 3 },
        staticOutput: { Phone: 1 },
        power: -6,
    };
    RobotFactory: BuildingItem = {
        name: () => t("RobotFactory"),
        staticInput: { Bat: 1, Al: 2, Sem: 2, Steel: 2 },
        staticOutput: { Rob: 1 },
        power: -5,
    };
    ToyFactory: BuildingItem = {
        name: () => t("ToyFactory"),
        staticInput: { Pla: 2, Bat: 1 },
        staticOutput: { Toy: 1 },
        power: -2,
    };
    ShoeFactory: BuildingItem = {
        name: () => t("ShoeFactory"),
        staticInput: { Pla: 2 },
        staticOutput: { Sho: 2 },
        power: -2,
    };
    ClothingFactory: BuildingItem = {
        name: () => t("ClothingFactory"),
        staticInput: { Pla: 1, Paper: 1 },
        staticOutput: { Clo: 3 },
        power: -2,
    };
    FashionFactory: BuildingItem = {
        name: () => t("FashionFactory"),
        staticInput: { Sho: 5, Clo: 5 },
        staticOutput: { Fas: 1 },
        power: -2,
    };
    SantaFactory: BuildingItem = {
        name: () => t("SantaFactory"),
        staticInput: { Toy: 10, Sho: 1, Clo: 1 },
        staticOutput: { Santa: 1 },
        power: -1,
        dlc: DLC[0],
    };
    BatteryFactory: BuildingItem = {
        name: () => t("BatteryFactory"),
        staticInput: { Al: 1, Coal: 1, Fe: 1 },
        staticOutput: { Bat: 1 },
        power: -4,
    };
    TitaniumAlloyPlant: BuildingItem = {
        name: () => t("TitaniumAlloyPlant"),
        staticInput: { Cr: 1, Steel: 1 },
        staticOutput: { Ti: 1 },
        power: -4,
    };
    ChromiumAlloyPlant: BuildingItem = {
        name: () => t("ChromiumAlloyPlant"),
        staticInput: { Li: 1, Al: 1 },
        staticOutput: { Cr: 1 },
        power: -4,
    };
    LiionBatteryFactory: BuildingItem = {
        name: () => t("LiionBatteryFactory"),
        staticInput: { Li: 2 },
        staticOutput: { Bat: 1 },
        power: -2,
        dlc: DLC[0],
    };
    GalvanicBatteryFactory: BuildingItem = {
        name: () => t("GalvanicBatteryFactory"),
        staticInput: { Cu: 2, Si: 1 },
        staticOutput: { Bat: 1 },
        power: -1,
    };
    ScreenFactory: BuildingItem = {
        name: () => t("ScreenFactory"),
        staticInput: { Glass: 1, Pla: 2, Si: 1 },
        staticOutput: { Scr: 1 },
        power: -3,
    };
    CameraFactory: BuildingItem = {
        name: () => t("CameraFactory"),
        staticInput: { Al: 1, Glass: 1, Sem: 1, Pla: 2, Bat: 1 },
        staticOutput: { Cam: 1 },
        power: -6,
    };
    ComputerFactory: BuildingItem = {
        name: () => t("ComputerFactory"),
        staticInput: { Bat: 2, Al: 2, Scr: 1, IC: 2, Pla: 2 },
        staticOutput: { PC: 1 },
        power: -6,
    };
    SuperComputerLab: BuildingItem = {
        name: () => t("SuperComputerLab"),
        staticInput: { PC: 10, IC: 10, Fib: 10 },
        staticOutput: { SuCp: 1 },
        power: -15,
    };
    QuantumComputerLab: BuildingItem = {
        name: () => t("QuantumComputerLab"),
        staticInput: { SuCp: 10, ErU: 100, WWW: 5 },
        staticOutput: { QtCp: 1 },
        power: -30,
    };
    BitcoinFarm: BuildingItem = {
        name: () => t("BitcoinFarm"),
        staticInput: { PC: 5, IC: 5 },
        staticOutput: { Bit: 1 },
        power: -100,
    };
    DogecoinFarm: BuildingItem = {
        name: () => t("DogecoinFarm"),
        staticInput: { Bit: 1, Fas: 5, Toy: 5 },
        staticOutput: { Doge: 1 },
        power: -100,
    };
    CarFactory: BuildingItem = {
        name: () => t("CarFactory"),
        staticInput: {
            Eng: 1,
            Steel: 10,
            Sem: 2,
            Glass: 2,
            Al: 2,
            Pla: 5,
            Petrol: 10,
            Lumb: 2,
        },
        staticOutput: { Car: 1 },
        power: -4,
    };
    RobocarFactory: BuildingItem = {
        name: () => t("RobocarFactory"),
        staticInput: { SuCp: 1, Car: 5, Rob: 5 },
        staticOutput: { RbCar: 1 },
        power: -10,
        dlc: DLC[0],
    };
    TrainFactory: BuildingItem = {
        name: () => t("TrainFactory"),
        staticInput: { Eng: 5, Steel: 50, Glass: 5, Al: 10, Pla: 10, Lumb: 10 },
        staticOutput: { Tra: 1 },
        power: -20,
        dlc: DLC[0],
    };
    EngineFactory: BuildingItem = {
        name: () => t("EngineFactory"),
        staticInput: { Steel: 2, Al: 1, Pla: 1 },
        staticOutput: { Eng: 1 },
        power: -2,
    };
    JetEngineFactory: BuildingItem = {
        name: () => t("JetEngineFactory"),
        staticInput: { Eng: 2, Al: 2, Steel: 2 },
        staticOutput: { Jet: 1 },
        power: -4,
    };
    GunFactory: BuildingItem = {
        name: () => t("GunFactory"),
        staticInput: { Steel: 1, Pla: 1, Lumb: 1 },
        staticOutput: { Gun: 1 },
        power: -2,
    };
    RadarFactory: BuildingItem = {
        name: () => t("RadarFactory"),
        staticInput: { Al: 2, Sem: 2, Bat: 2 },
        staticOutput: { Radar: 1 },
        power: -2,
    };
    ArtilleryFactory: BuildingItem = {
        name: () => t("ArtilleryFactory"),
        staticInput: { Dynm: 2, Gun: 2, Steel: 2 },
        staticOutput: { Art: 1 },
        power: -2,
    };
    MissileFactory: BuildingItem = {
        name: () => t("MissileFactory"),
        staticInput: { Art: 10, Radar: 8, Dynm: 6, Pplt: 6, Jet: 6 },
        staticOutput: { Mis: 1 },
        power: -5,
    };
    ProjectV2: BuildingItem = {
        name: () => t("ProjectV2"),
        staticInput: { Roc: 1, Art: 5 },
        staticOutput: { Mis: 1 },
        power: -5,
        dlc: DLC[0],
    };
    ICBMFactory: BuildingItem = {
        name: () => t("ICBMFactory"),
        staticInput: { Roc: 5, Nmis: 5, Radar: 5 },
        staticOutput: { ICBM: 1 },
        power: -10,
        dlc: DLC[0],
    };
    AtomicBombFactory: BuildingItem = {
        name: () => t("AtomicBombFactory"),
        staticInput: { ErU: 10, Dynm: 10, Al: 10, Fe: 10 },
        staticOutput: { Abom: 1 },
        power: -5,
    };
    NuclearMissileFactory: BuildingItem = {
        name: () => t("NuclearMissileFactory"),
        staticInput: { Abom: 5, Mis: 5, Ti: 5 },
        staticOutput: { Nmis: 1 },
        power: -5,
    };
    DynamiteFactory: BuildingItem = {
        name: () => t("DynamiteFactory"),
        staticInput: { Wood: 2, Oil: 2, Coal: 1 },
        staticOutput: { Dynm: 1 },
        power: -2,
    };
    LiquidPropellantFactory: BuildingItem = {
        name: () => t("LiquidPropellantFactory"),
        staticInput: { Petrol: 10 },
        staticOutput: { Pplt: 1 },
        power: -4,
    };
    GasPropellantFactory: BuildingItem = {
        name: () => t("GasPropellantFactory"),
        staticInput: { Gas: 24 },
        staticOutput: { Pplt: 1 },
        power: -4,
    };
    RocketFactory: BuildingItem = {
        name: () => t("RocketFactory"),
        staticInput: { Radar: 5, Steel: 5, Jet: 5, Pplt: 10, Ti: 10 },
        staticOutput: { Roc: 1 },
        power: -10,
    };
    ProjectVostok: BuildingItem = {
        name: () => t("ProjectVostok"),
        staticInput: { ErU: 10, Steel: 30, Radar: 7, Pplt: 10 },
        staticOutput: { Roc: 1 },
        power: -10,
        dlc: DLC[0],
    };
    SatelliteFactory: BuildingItem = {
        name: () => t("SatelliteFactory"),
        staticInput: { Radar: 10, Al: 10, IC: 10, Glass: 10, Ti: 10 },
        staticOutput: { Sat: 1 },
        power: -10,
    };
    SpaceshipFactory: BuildingItem = {
        name: () => t("SpaceshipFactory"),
        staticInput: { Mis: 5, IC: 10, ErU: 20, Radar: 20 },
        staticOutput: { Spa: 1 },
        power: -15,
    };
    AirShuttleInc: BuildingItem = {
        name: () => t("AirShuttleInc"),
        staticInput: { Roc: 5, Air: 4, Zep: 4, Jet: 12, Rob: 12 },
        staticOutput: { Spa: 1 },
        power: -15,
    };
    BattleshipFactory: BuildingItem = {
        name: () => t("BattleshipFactory"),
        staticInput: { Ship: 5, Radar: 5, Art: 10 },
        staticOutput: { Btshp: 1 },
        power: -15,
        dlc: DLC[0],
    };
    AircraftCarrierFactory: BuildingItem = {
        name: () => t("AircraftCarrierFactory"),
        staticInput: { Air: 10, Hel: 10, Ship: 5, ErU: 50 },
        staticOutput: { Crr: 1 },
        power: -25,
        dlc: DLC[0],
    };
    NavyCommand: BuildingItem = {
        name: () => t("NavyCommand"),
        staticInput: { Crr: 10, Sub: 10, Btshp: 10, Nmis: 10 },
        staticOutput: { Navy: 1 },
        power: -25,
        dlc: DLC[0],
    };
    StealthFighterFactory: BuildingItem = {
        name: () => t("StealthFighterFactory"),
        staticInput: { Air: 100, Mis: 200, SkyNt: 1 },
        staticOutput: { StFgt: 100 },
        power: -10,
        dlc: DLC[0],
    };
    AirForceCommand: BuildingItem = {
        name: () => t("AirForceCommand"),
        staticInput: { Air: 20, Hel: 20, StFgt: 20, Mis: 60, Radar: 30 },
        staticOutput: { AirFc: 1 },
        power: -25,
        dlc: DLC[0],
    };
    ArmyCommand: BuildingItem = {
        name: () => t("ArmyCommand"),
        staticInput: { Tank: 1000, Art: 1000, Gun: 5000 },
        staticOutput: { Army: 1 },
        power: -15,
    };
    SpaceStationFactory: BuildingItem = {
        name: () => t("SpaceStationFactory"),
        staticInput: { Spa: 10, Sat: 10, Roc: 10 },
        staticOutput: { ISS: 1 },
        power: -25,
    };
    SpaceForceCommand: BuildingItem = {
        name: () => t("SpaceForceCommand"),
        staticInput: { ISS: 2, ICBM: 2 },
        staticOutput: { SpFc: 1 },
        power: -50,
        dlc: DLC[0],
    };
    SpaceColonyInc: BuildingItem = {
        name: () => t("SpaceColonyInc"),
        staticInput: { ISS: 2, SNS: 2 },
        staticOutput: { SpCo: 1 },
        power: -50,
    };
    TankFactory: BuildingItem = {
        name: () => t("TankFactory"),
        staticInput: { Eng: 2, Steel: 15, Pla: 5, Art: 2, Al: 2, Coal: 10 },
        staticOutput: { Tank: 1 },
        power: -4,
    };
    Shipyard: BuildingItem = {
        name: () => t("Shipyard"),
        staticInput: {
            Eng: 10,
            Steel: 50,
            Glass: 10,
            Al: 10,
            Pla: 10,
            Radar: 5,
            Lumb: 10,
        },
        staticOutput: { Ship: 1 },
        power: -15,
    };
    SubmarineFactory: BuildingItem = {
        name: () => t("SubmarineFactory"),
        staticInput: {
            Eng: 5,
            Steel: 20,
            Lumb: 10,
            Radar: 5,
            Glass: 10,
            Mis: 5,
            Pplt: 10,
        },
        staticOutput: { Sub: 1 },
        power: -15,
        dlc: DLC[0],
    };
    AircraftFactory: BuildingItem = {
        name: () => t("AircraftFactory"),
        staticInput: {
            Jet: 4,
            Steel: 40,
            Ti: 5,
            Radar: 5,
            Glass: 5,
            Al: 20,
            Pla: 10,
        },
        staticOutput: { Air: 1 },
        power: -15,
    };
    _FoodToICBM: BuildingItem = {
        name: () => "",
        power: -20,
        staticInput: { HpyMl: 22 },
        staticOutput: { ICBM: 1 },
        available: () => false,
    };
    _FoodToNuclearMissile: BuildingItem = {
        name: () => "",
        power: -10,
        staticInput: { Cktl: 4 },
        staticOutput: { Nmis: 1 },
        available: () => false,
    };
    _FoodToAircraftCarrier: BuildingItem = {
        name: () => "",
        power: -10,
        staticInput: { Wine: 7, Pastry: 7 },
        staticOutput: { Crr: 1 },
        available: () => false,
    };
    MREPlant: BuildingItem = {
        name: () => t("MREPlant"),
        dlc: DLC[1],
        power: -10,
        staticInput: { Whppr: 3 },
        staticOutput: { Spa: 1 },
        panel: MultipleRecipePanel,
        tick: tickMultipleRecipe,
        recipes: () => {
            const result: BuildingNumberMap = {
                MREPlant: 1,
                _FoodToNuclearMissile: 5,
                _FoodToAircraftCarrier: 10,
                _FoodToICBM: 15,
            };
            return result;
        },
    };
    HelicopterFactory: BuildingItem = {
        name: () => t("HelicopterFactory"),
        staticInput: { Eng: 2, Steel: 5, Glass: 5, Al: 5, Radar: 2, Gun: 5 },
        staticOutput: { Hel: 1 },
        power: -10,
        dlc: DLC[0],
    };
    ZeppelinFactory: BuildingItem = {
        name: () => t("ZeppelinFactory"),
        staticInput: {
            Eng: 5,
            Steel: 5,
            Lumb: 10,
            Glass: 5,
            Al: 15,
            Pla: 50,
            Radar: 5,
        },
        staticOutput: { Zep: 1 },
        power: -10,
    };
    VideoFarm: BuildingItem = {
        name: () => t("VideoFarm"),
        staticInput: { Cam: 1, Fas: 1 },
        staticOutput: { Video: 5 },
        power: -10,
    };
    MovieStudio: BuildingItem = {
        name: () => t("MovieStudio"),
        staticInput: { Video: 5, PC: 1, Cam: 2, Fas: 2 },
        staticOutput: { Movie: 1 },
        power: -10,
    };
    GameStudio: BuildingItem = {
        name: () => t("GameStudio"),
        staticInput: { Phone: 10, PC: 10, Toy: 10 },
        staticOutput: { Game: 1 },
        power: -15,
    };
    ConsoleFactory: BuildingItem = {
        name: () => t("ConsoleFactory"),
        staticInput: { Game: 5, IC: 25, Pla: 25, Video: 25, Al: 25 },
        staticOutput: { Con: 1 },
        power: -15,
    };
    GameStationInc: BuildingItem = {
        name: () => t("GameStationInc"),
        staticInput: { Game: 5, Sitcom: 1, Movie: 1, Mus: 1 },
        staticOutput: { Con: 1 },
        power: -15,
        dlc: DLC[0],
    };
    SoftwareCompany: BuildingItem = {
        name: () => t("SoftwareCompany"),
        staticInput: { Phone: 10, PC: 10, Book: 10 },
        staticOutput: { Soft: 1 },
        power: -15,
    };
    SoftwareCompiler: BuildingItem = {
        name: () => t("SoftwareCompiler"),
        staticInput: { Rob: 10, Santa: 10, Fib: 7, IC: 7, Li: 20 },
        staticOutput: { Soft: 1 },
        power: -15,
        dlc: DLC[0],
    };
    OperatingSystemCompany: BuildingItem = {
        name: () => t("OperatingSystemCompany"),
        staticInput: { PC: 10, Soft: 10, Video: 10 },
        staticOutput: { OS: 1 },
        power: -25,
    };
    DatabaseCompany: BuildingItem = {
        name: () => t("DatabaseCompany"),
        staticInput: { Soft: 10, Fib: 10 },
        staticOutput: { DB: 1 },
        power: -25,
    };
    LinuxDistribution: BuildingItem = {
        name: () => t("LinuxDistribution"),
        staticInput: { PC: 10, Game: 5, Soft: 5, Rob: 50 },
        staticOutput: { OS: 1 },
        power: -25,
        dlc: DLC[0],
    };
    SatelinkInc: BuildingItem = {
        name: () => t("SatelinkInc"),
        staticInput: { Spa: 4, Sat: 6, Roc: 6 },
        staticOutput: { WWW: 1 },
        power: -50,
        dlc: DLC[0],
    };
    WebBrowser: BuildingItem = {
        name: () => t("WebBrowser"),
        staticInput: { OS: 1, Soft: 2, Cr: 50, Fib: 25 },
        staticOutput: { WWW: 1 },
        power: -25,
    };
    SkyNetInc: BuildingItem = {
        name: () => t("SkyNetInc"),
        staticInput: { SuCp: 10, WWW: 5 },
        staticOutput: { SkyNt: 1 },
        power: -100,
        dlc: DLC[0],
    };
    SocialNetworkInc: BuildingItem = {
        name: () => t("SocialNetworkInc"),
        staticInput: { WWW: 1, DB: 1, Video: 100, Mus: 25 },
        // For policy Meta Rebranding
        // input: { WWW: 1, Game: 5, SuCp: 10, Bit: 10, Doge: 10 },
        staticOutput: { SNS: 1 },
        power: -100,
    };
    _SixCourseSNS: BuildingItem = {
        name: () => "",
        power: -50,
        staticInput: { Meal6: 6, Cam: 100, Phone: 100 },
        staticOutput: { SNS: 1 },
        available: () => false,
    };
    _ThreeCourseWWW: BuildingItem = {
        name: () => "",
        power: -50,
        staticInput: { Meal3: 8 },
        staticOutput: { WWW: 2 },
        available: () => false,
    };
    Photogram: BuildingItem = {
        name: () => t("Photogram"),
        dlc: DLC[1],
        power: -50,
        staticInput: { Meal3: 24, Video: 50 },
        staticOutput: { SNS: 1 },
        panel: MultipleRecipePanel,
        tick: tickMultipleRecipe,
        recipes: () => {
            const result: BuildingNumberMap = {
                Photogram: 1,
                _SixCourseSNS: 10,
                _ThreeCourseWWW: 10,
            };
            return result;
        },
    };
    SnapTokInc: BuildingItem = {
        name: () => t("SnapTokInc"),
        staticInput: { Cam: 130, Phone: 90, Movie: 50, SuCp: 50 },
        staticOutput: { SNS: 1 },
        power: -100,
    };
    FaceAppInc: BuildingItem = {
        name: () => t("FaceAppInc"),
        staticInput: { SkyNt: 1 },
        staticOutput: { SNS: 4 },
        power: -50,
        available: () => D.map === "SanJose",
    };
    BitcoinMiner: BuildingItem = {
        name: () => t("BitcoinMiner"),
        staticInput: { SuCp: 1, Soft: 1 },
        staticOutput: { Bit: 18 },
        power: -100,
        available: () => D.map === "SanJose",
    };
    MusifyInc: BuildingItem = {
        name: () => t("MusifyInc"),
        staticInput: { SNS: 1, DB: 5, Mus: 500 },
        staticOutput: { CldSm: 1 },
        power: -100,
    };
    WebflixInc: BuildingItem = {
        name: () => t("WebflixInc"),
        staticInput: { SE: 1, WWW: 2, Sitcom: 120, Movie: 120 },
        staticOutput: { CldSm: 1 },
        power: -100,
        dlc: DLC[0],
    };
    GameCloudInc: BuildingItem = {
        name: () => t("GameCloudInc"),
        staticInput: { Con: 5, OS: 5, Game: 31 },
        staticOutput: { CldSm: 1 },
        power: -100,
        dlc: DLC[0],
    };
    SearchEngineCompany: BuildingItem = {
        name: () => t("SearchEngineCompany"),
        staticInput: { WWW: 1, DB: 1, Eng: 50, Jet: 50 },
        staticOutput: { SE: 1 },
        power: -100,
        dlc: DLC[0],
    };
    TVStudio: BuildingItem = {
        name: () => t("TVStudio"),
        staticInput: { Video: 2, PC: 1, Cam: 1, Fas: 1 },
        staticOutput: { Sitcom: 1 },
        power: -10,
        dlc: DLC[0],
    };
    TVStudioPlus: BuildingItem = {
        name: () => t("TVStudioPlus"),
        staticInput: { Sitcom: 10, QtCp: 1 },
        staticOutput: { CldSm: 1 },
        power: -200,
    };
    GlassFactory: BuildingItem = {
        name: () => t("GlassFactory"),
        staticInput: { Si: 2, Coal: 1 },
        staticOutput: { Glass: 1 },
        power: -2,
    };
    FiberFactory: BuildingItem = {
        name: () => t("FiberFactory"),
        staticInput: { Glass: 4, Pla: 4 },
        staticOutput: { Fib: 1 },
        power: -4,
    };
    GuitarFactory: BuildingItem = {
        name: () => t("GuitarFactory"),
        staticInput: { Pla: 1, Lumb: 2 },
        staticOutput: { Gui: 2 },
        power: -2,
    };
    DrumFactory: BuildingItem = {
        name: () => t("DrumFactory"),
        staticInput: { Pla: 1, Fe: 2, Lumb: 1 },
        staticOutput: { Dru: 1 },
        power: -2,
    };
    RecordingStudio: BuildingItem = {
        name: () => t("RecordingStudio"),
        staticInput: { Gui: 5, Dru: 1 },
        staticOutput: { Mus: 1 },
        power: -10,
        dlc: DLC[0],
    };
    MusicProducer: BuildingItem = {
        name: () => t("MusicProducer"),
        staticInput: { Gui: 1, Dru: 1, Paper: 12 },
        staticOutput: { Mus: 1 },
        power: -5,
        available: () => D.map === "Stockholm",
    };
    _RechargeBatteryC: BuildingItem = {
        name: () => "",
        staticInput: { BatSl: 1, Coal: 1 },
        staticOutput: { Bat: 1 },
        power: -4,
        available: () => false,
    };
    _RechargeBatteryLi: BuildingItem = {
        name: () => "",
        staticInput: { BatSl: 1, Li: 1 },
        staticOutput: { Bat: 1 },
        power: -3,
        available: () => false,
    };
    _UseBattery: BuildingItem = {
        name: () => "",
        staticInput: {},
        staticOutput: { BatSl: 1 },
        power: 0,
        available: () => false,
    };
    _RecycleBatteryLi: BuildingItem = {
        name: () => "",
        staticInput: { BatSl: 1 },
        staticOutput: { Li: 1 },
        power: -2,
        available: () => false,
    };
    BatteryRecycler: BuildingItem = {
        name: () => t("BatteryRecycler"),
        staticInput: { BatSl: 1 },
        staticOutput: { Al: 1, Fe: 1 },
        power: -2,
        recipes: () => {
            const result: BuildingNumberMap = {
                BatteryRecycler: 1,
                _RechargeBatteryC: 1,
            };
            if (MAP[D.map].deposits.Li > 0) {
                result._RechargeBatteryLi = 1;
                result._RecycleBatteryLi = 1;
            }
            return result;
        },
        panel: MultipleRecipePanel,
        tick: tickMultipleRecipe,
        research: 5,
    };
    //////////////////// Science & Culture ////////////////////
    School: BuildingItem = {
        name: () => t("School"),
        staticInput: { Book: 1 },
        staticOutput: { Sci: 4 },
        power: -4,
    };
    Polytechnic: BuildingItem = {
        name: () => t("Polytechnic"),
        staticInput: { Sem: 1 },
        staticOutput: { Sci: 1 },
        power: -2,
    };
    University: BuildingItem = {
        name: () => t("University"),
        staticInput: { Fas: 1, PC: 1 },
        staticOutput: { Sci: 15, Cul: 15 },
        power: -10,
        dlc: DLC[0],
    };
    Colosseum: BuildingItem = {
        name: () => t("Colosseum"),
        staticInput: { Sho: 1, Clo: 1 },
        staticOutput: { Cul: 1 },
        power: -5,
    };
    OperaHouse: BuildingItem = {
        name: () => t("OperaHouse"),
        staticInput: { Mus: 1 },
        staticOutput: { Cul: 10 },
        power: -5,
        dlc: DLC[0],
    };
    BookPublisher: BuildingItem = {
        name: () => t("BookPublisher"),
        staticInput: { Paper: 6, Coal: 8 },
        staticOutput: { Book: 1, Cul: 1 },
        power: -2,
    };
    EBookInc: BuildingItem = {
        name: () => t("EBookInc"),
        staticInput: { Scr: 1, Bat: 1, Sem: 1 },
        staticOutput: { Book: 1, Sci: 1 },
        power: -4,
    };
    AirLiquidizer: BuildingItem = {
        name: () => t("AirLiquidizer"),
        staticInput: {},
        staticOutput: { Water: 1 },
        power: -8,
        dlc: DLC[1],
        research: 10,
    };
    //////////////////// Farming ////////////////////
    _Rice: BuildingItem = {
        name: () => "",
        power: -1,
        staticInput: {},
        staticOutput: { Rice: 1 },
        available: () => false,
    };
    _Cocoa: BuildingItem = {
        name: () => "",
        power: -1,
        staticInput: {},
        staticOutput: { Cocoa: 1 },
        available: () => false,
    };
    _Corn: BuildingItem = {
        name: () => "",
        power: -1,
        staticInput: {},
        staticOutput: { Corn: 1 },
        available: () => false,
    };
    _Wheat: BuildingItem = {
        name: () => "",
        power: -1,
        staticInput: {},
        staticOutput: { Wheat: 1 },
        available: () => false,
    };
    _Soy: BuildingItem = {
        name: () => "",
        power: -1,
        staticInput: {},
        staticOutput: { Soy: 1 },
        available: () => false,
    };
    _Sgcn: BuildingItem = {
        name: () => "",
        power: -1,
        staticInput: {},
        staticOutput: { Sgcn: 1 },
        available: () => false,
    };
    _Coffe: BuildingItem = {
        name: () => "",
        power: -1,
        staticInput: {},
        staticOutput: { Coffe: 1 },
        available: () => false,
    };
    _Pmpk: BuildingItem = {
        name: () => "",
        power: -1,
        staticInput: {},
        staticOutput: { Pmpk: 2 },
        available: () => false,
    };
    _Vege: BuildingItem = {
        name: () => "",
        power: -1,
        staticInput: {},
        staticOutput: { Vege: 1 },
        available: () => false,
    };
    _Water_Rice: BuildingItem = {
        name: () => "",
        power: -2,
        staticInput: { Water: 1 },
        staticOutput: { Rice: 1 },
        available: () => false,
        ignoreForPricing: true,
    };
    _Water_Cocoa: BuildingItem = {
        name: () => "",
        power: -2,
        staticInput: { Water: 1 },
        staticOutput: { Cocoa: 1 },
        available: () => false,
        ignoreForPricing: true,
    };
    _Water_Corn: BuildingItem = {
        name: () => "",
        power: -2,
        staticInput: { Water: 1 },
        staticOutput: { Corn: 1 },
        available: () => false,
        ignoreForPricing: true,
    };
    _Water_Wheat: BuildingItem = {
        name: () => "",
        power: -2,
        staticInput: { Water: 1 },
        staticOutput: { Wheat: 1 },
        available: () => false,
        ignoreForPricing: true,
    };
    _Water_Soy: BuildingItem = {
        name: () => "",
        power: -2,
        staticInput: { Water: 1 },
        staticOutput: { Soy: 1 },
        available: () => false,
        ignoreForPricing: true,
    };
    _Water_Sgcn: BuildingItem = {
        name: () => "",
        power: -2,
        staticInput: { Water: 1 },
        staticOutput: { Sgcn: 1 },
        available: () => false,
        ignoreForPricing: true,
    };
    _Water_Coffe: BuildingItem = {
        name: () => "",
        power: -2,
        staticInput: { Water: 1 },
        staticOutput: { Coffe: 1 },
        available: () => false,
        ignoreForPricing: true,
    };
    _Water_Pmpk: BuildingItem = {
        name: () => "",
        power: -2,
        staticInput: { Water: 1 },
        staticOutput: { Pmpk: 2 },
        available: () => false,
        ignoreForPricing: true,
    };
    _Water_Vege: BuildingItem = {
        name: () => "",
        power: -2,
        staticInput: { Water: 1 },
        staticOutput: { Vege: 1 },
        available: () => false,
        ignoreForPricing: true,
    };
    _PumpkinSpiceLatte: BuildingItem = {
        name: () => "",
        power: -2,
        staticInput: { Pmpk: 2, RfSgr: 2, Coffe: 2, Milk: 2 },
        staticOutput: { PSL: 1 },
        available: () => false,
    };
    _PumpkinPie: BuildingItem = {
        name: () => "",
        power: -2,
        staticInput: { Pmpk: 2, Flour: 2, Bttr: 2, Milk: 2 },
        staticOutput: { Pmkpi: 1 },
        available: () => false,
    };
    _Cookie: BuildingItem = {
        name: () => "",
        power: -4,
        staticInput: { Flour: 1, Water: 1, Bttr: 1, RfSgr: 1 },
        staticOutput: { Cki: 2 },
        available: () => false,
    };
    _Cake: BuildingItem = {
        name: () => "",
        power: -6,
        staticInput: { Flour: 1, Water: 1, Egg: 2, Milk: 1, RfSgr: 1 },
        staticOutput: { Cake: 1 },
        available: () => false,
    };
    _Pastry: BuildingItem = {
        name: () => "",
        power: -15,
        staticInput: { Flour: 10, Bttr: 20 },
        staticOutput: { Pastry: 1 },
        available: () => false,
    };
    Bakery: BuildingItem = {
        name: () => t("Bakery"),
        dlc: DLC[1],
        power: -4,
        staticInput: { Flour: 3, Water: 1 },
        staticOutput: { Bread: 1 },
        panel: MultipleRecipePanel,
        tick: tickMultipleRecipe,
        recipes: () => {
            const result: BuildingNumberMap = { Bakery: 1, _Cookie: 10, _Cake: 20, _Pastry: 30 };
            if (isOctober() || CC_DEBUG) {
                result._PumpkinPie = 1;
            }
            return result;
        },
    };
    FlourMill: BuildingItem = FlourMillDefinition();
    _RiceFlour: BuildingItem = {
        name: () => "",
        staticInput: { Corn: 2, Rice: 2 },
        staticOutput: { Flour: 2 },
        power: -4,
        available: () => false,
    };
    ChickenFarm: BuildingItem = {
        name: () => t("ChickenFarm"),
        dlc: DLC[1],
        power: -2,
        staticInput: { Fodr: 3 },
        staticOutput: { Chkn: 1, Egg: 2 },
    };
    CowFarm: BuildingItem = {
        name: () => t("CowFarm"),
        dlc: DLC[1],
        power: -4,
        staticInput: { Fodr: 8 },
        staticOutput: { Beef: 1, Milk: 8 },
    };
    PigFarm: BuildingItem = {
        name: () => t("PigFarm"),
        dlc: DLC[1],
        power: -3,
        staticInput: { Fodr: 6 },
        staticOutput: { Pork: 2 },
    };
    DairyFactory: BuildingItem = {
        name: () => t("DairyFactory"),
        dlc: DLC[1],
        power: -2,
        staticInput: { Milk: 4 },
        staticOutput: { Bttr: 1, Chees: 1 },
    };
    FodderFactory: BuildingItem = {
        name: () => t("FodderFactory"),
        dlc: DLC[1],
        power: -2,
        staticInput: { Corn: 1, Soy: 1 },
        staticOutput: { Fodr: 2 },
    };
    SugarRefinery: BuildingItem = {
        name: () => t("SugarRefinery"),
        dlc: DLC[1],
        power: -4,
        staticInput: { Sgcn: 4 },
        staticOutput: { RfSgr: 2, Fodr: 2 },
    };
    _CornSyrup: BuildingItem = {
        name: () => "",
        power: -4,
        staticInput: { Corn: 4 },
        staticOutput: this.SugarRefinery.staticOutput,
        available: () => false,
    };
    _Burger: BuildingItem = {
        name: () => "",
        power: -6,
        staticInput: { Beef: 2, Bread: 2, Vege: 1, Chees: 1 },
        staticOutput: { Brgr: 1 },
        available: () => false,
    };
    _Sandwich: BuildingItem = {
        name: () => "",
        power: -4,
        staticInput: { Bread: 2, Chkn: 1, Egg: 1, Vege: 1 },
        staticOutput: { Swch: 1 },
        available: () => false,
    };
    _Pizza: BuildingItem = {
        name: () => "",
        power: -6,
        staticInput: { Flour: 4, Chees: 2, Ssg: 2 },
        staticOutput: { Pizza: 1 },
        available: () => false,
    };
    _HappyMeal: BuildingItem = {
        name: () => "",
        power: -10,
        staticInput: { Brgr: 10, FrCkn: 10, Toy: 10 },
        staticOutput: { HpyMl: 1 },
        available: () => false,
    };
    _Whopper: BuildingItem = {
        name: () => "",
        power: -10,
        staticInput: { Brgr: 10, Bread: 10 },
        staticOutput: { Whppr: 1 },
        available: () => false,
    };
    _FriedRice: BuildingItem = {
        name: () => "",
        power: -4,
        staticInput: { Rice: 4, Egg: 1, Chkn: 1 },
        staticOutput: { FrRi: 1 },
        available: () => false,
    };
    _Sushi: BuildingItem = {
        name: () => "",
        power: -6,
        staticInput: { Rice: 10, Fish: 5 },
        staticOutput: { Sushi: 1 },
        available: () => false,
    };
    _FriedChicken: BuildingItem = {
        name: () => "",
        power: -4,
        staticInput: { Chkn: 4, Egg: 1, Flour: 1 },
        staticOutput: { FrCkn: 2 },
        available: () => false,
    };
    FastFoodChain: BuildingItem = {
        name: () => t("FastFoodChain"),
        dlc: DLC[1],
        power: -4,
        staticInput: { Bread: 2, Ssg: 1 },
        staticOutput: { Htdg: 1 },
        panel: MultipleRecipePanel,
        tick: tickMultipleRecipe,
        recipes: () => {
            const result: BuildingNumberMap = {
                FastFoodChain: 1,
                _FriedRice: 10,
                _FriedChicken: 15,
                _Sandwich: 20,
                _Burger: 25,
                _Pizza: 30,
                _HappyMeal: 30,
                _Whopper: 30,
                _Sushi: 30,
            };
            return result;
        },
    };
    _Alcohol: BuildingItem = {
        name: () => "",
        power: -4,
        staticInput: { Water: 10, Wheat: 10, Corn: 10 },
        staticOutput: { Alchl: 1 },
        available: () => false,
    };
    _AlcoholAlt: BuildingItem = {
        name: () => "",
        power: -4,
        staticInput: { Water: 10, Wheat: 10, Rice: 10 },
        staticOutput: { Alchl: 1 },
        available: () => false,
    };
    _Wine: BuildingItem = {
        name: () => "",
        power: -4,
        staticInput: { Water: 10, Alchl: 10, Sgcn: 10, RfSgr: 5 },
        staticOutput: { Wine: 1 },
        available: () => false,
    };
    _Cocktail: BuildingItem = {
        name: () => "",
        power: -8,
        staticInput: { Water: 10, Alchl: 10, SftDk: 10, Coffe: 5 },
        staticOutput: { Cktl: 1 },
        available: () => false,
    };
    _SoyMilk: BuildingItem = {
        name: () => "",
        power: -4,
        staticInput: { Soy: 15, RfSgr: 5 },
        staticOutput: { MlkPd: 1 },
        available: () => false,
    };
    DrinkFactory: BuildingItem = {
        name: () => t("DrinkFactory"),
        dlc: DLC[1],
        power: -4,
        staticInput: { Water: 10, RfSgr: 10 },
        staticOutput: { SftDk: 1 },
        panel: MultipleRecipePanel,
        tick: tickMultipleRecipe,
        recipes: () => {
            const result: BuildingNumberMap = {
                DrinkFactory: 1,
                _Alcohol: 10,
                _AlcoholAlt: 10,
                _Wine: 20,
                _Cocktail: 20,
            };
            if (isOctober() || CC_DEBUG) {
                result._PumpkinSpiceLatte = 1;
            }
            return result;
        },
    };
    // See the comments in Logic.unlockableBuildings
    FishPond: BuildingItem = {
        name: () => t("FishPond"),
        dlc: DLC[1],
        power: -2,
        staticInput: { Fodr: 2 },
        staticOutput: { Fish: 1 },
        output: (entity) => {
            if (this.FishPond.canBuildOnTile(entity.grid) && !isBuildingLevelTooHigh(entity)) {
                return { Fish: this.FishPond.staticOutput.Fish };
            }
            return { Fish: 0 };
        },
        canBuildOnTile: (xy) => {
            if (D.map === "Auckland") {
                return true;
            }
            return requireDeposit("Water", xy);
        },
        panel: () => {
            return {
                view: (vnode) => {
                    return isBuildingLevelTooHigh(vnode.attrs.entity)
                        ? m(".box.banner.text-m", t("WaterEntityLevelTooHighDesc"))
                        : null;
                },
            };
        },
        tick: (v) => {
            tickGeneral(v);
            if (isPolicyActive("ElectricFishPond")) {
                const count = T.buildingCount.HydroPowerPlant ?? 0;
                addBoostAmount(T.next.boosts, v.entity.grid, v.entity.type, [0.2 * count, 0.2 * count]);
                addBoostAmount(T.next.boostsStable, v.entity.grid, v.entity.type, [0.2 * count, 0.2 * count]);
            }
        },
    };
    _ChickenSausage: BuildingItem = {
        name: () => "",
        power: -4,
        staticInput: { Chkn: 2 },
        staticOutput: { Ssg: 2 },
        available: () => false,
    };
    _BeefSausage: BuildingItem = {
        name: () => "",
        power: -4,
        staticInput: { Beef: 2 },
        staticOutput: { Ssg: 5 },
        available: () => false,
    };
    _SoySausage: BuildingItem = {
        name: () => "",
        power: -4,
        staticInput: { Soy: 10, Vege: 10 },
        staticOutput: { Ssg: 1 },
        available: () => false,
    };
    SausageFactory: BuildingItem = {
        name: () => t("SausageFactory"),
        dlc: DLC[1],
        power: -4,
        staticInput: { Pork: 1 },
        staticOutput: { Ssg: 1 },
        panel: MultipleRecipePanel,
        tick: tickMultipleRecipe,
        recipes: () => {
            const result: BuildingNumberMap = {
                SausageFactory: 1,
                _SoySausage: 10,
                _ChickenSausage: 20,
                _BeefSausage: 30,
            };
            return result;
        },
    };
    _SixCourseMeal: BuildingItem = {
        name: () => "",
        power: -40,
        staticInput: { Alchl: 100, Cake: 100, Brgr: 100, Htdg: 100, Swch: 100 },
        staticOutput: { Meal6: 1 },
        available: () => false,
    };
    _NineCourseMeal: BuildingItem = {
        name: () => "",
        power: -60,
        staticInput: {
            Cktl: 100,
            Pastry: 100,
            Sushi: 100,
            Wine: 100,
            Whppr: 100,
            Pizza: 100,
            Ssg: 100,
            FrRi: 100,
            HpyMl: 100,
        },
        staticOutput: { Meal9: 1 },
        available: () => false,
    };
    FineDiningRestaurant: BuildingItem = {
        name: () => t("FineDiningRestaurant"),
        dlc: DLC[1],
        power: -20,
        staticInput: { SftDk: 100, FrCkn: 100 },
        staticOutput: { Meal3: 1 },
        panel: MultipleRecipePanel,
        tick: tickMultipleRecipe,
        recipes: () => {
            const result: BuildingNumberMap = {
                FineDiningRestaurant: 1,
                _SixCourseMeal: 10,
                _NineCourseMeal: 20,
            };
            return result;
        },
    };
    FoodProcessingPlant: BuildingItem = {
        name: () => t("FoodProcessingPlant"),
        dlc: DLC[1],
        power: -10,
        research: 20,
        cost: 20,
        staticInput: {},
        staticOutput: {},
        panel: MultipleRecipePanel,
        tick: tickMultipleRecipe,
        recipes: () => {
            const result: BuildingNumberMap = {
                _FrozenVegetable: 1,
                _ReverseFrozenVegetable: 1,
                _MilkPowder: 1,
                _ReverseMilkPowder: 1,
                _CannedFish: 1,
                _ReverseCannedFish: 1,
                _CocoaPowder: 1,
                _FrozenPork: 1,
                _ReverseFrozenPork: 1,
                _FrozenChicken: 1,
                _ReverseFrozenChicken: 1,
                _CannedBeef: 1,
                _ReverseCannedBeef: 1,
            };
            return result;
        },
    };
    _FrozenVegetable: BuildingItem = {
        name: () => "",
        power: -10,
        staticInput: { Vege: 20 },
        staticOutput: { FVege: 1 },
        available: () => false,
    };
    _ReverseFrozenVegetable: BuildingItem = reverse(this._FrozenVegetable);
    _MilkPowder: BuildingItem = {
        name: () => "",
        power: -10,
        staticInput: { Milk: 20 },
        staticOutput: { MlkPd: 1, Water: 10 },
        available: () => false,
    };
    _ReverseMilkPowder: BuildingItem = reverse(this._MilkPowder);
    _CannedFish: BuildingItem = {
        name: () => "",
        power: -5,
        staticInput: { Fish: 10, Al: 2 },
        staticOutput: { CFish: 1 },
        available: () => false,
    };
    _ReverseCannedFish: BuildingItem = reverse(this._CannedFish);
    _CocoaPowder: BuildingItem = {
        name: () => "",
        power: -5,
        staticInput: { Cocoa: 10 },
        staticOutput: { CcoPd: 1 },
        available: () => false,
    };
    _FrozenPork: BuildingItem = {
        name: () => "",
        power: -10,
        staticInput: { Pork: 20 },
        staticOutput: { FPork: 1 },
        available: () => false,
    };
    _ReverseFrozenPork: BuildingItem = reverse(this._FrozenPork);
    _FrozenChicken: BuildingItem = {
        name: () => "",
        power: -10,
        staticInput: { Chkn: 20 },
        staticOutput: { FzCkn: 1 },
        available: () => false,
    };
    _ReverseFrozenChicken: BuildingItem = reverse(this._FrozenChicken);
    _CannedBeef: BuildingItem = {
        name: () => "",
        power: -5,
        staticInput: { Beef: 10, Al: 2 },
        staticOutput: { CBeef: 1 },
        available: () => false,
    };
    _ReverseCannedBeef: BuildingItem = reverse(this._CannedBeef);
    //////////////////// Power Plants ////////////////////
    CoalPowerPlant: BuildingItem = {
        name: () => t("CoalPowerPlant"),
        staticInput: { Coal: 1 },
        staticOutput: {},
        power: 15,
        tick: tickPowerPlant,
    };
    NuclearPowerPlant: BuildingItem = {
        name: () => t("NuclearPowerPlant"),
        staticInput: { ErU: 1 },
        staticOutput: {},
        power: 200,
        tick: tickPowerPlant,
    };
    PetrolPowerPlant: BuildingItem = {
        name: () => t("PetrolPowerPlant"),
        staticInput: { Petrol: 1 },
        staticOutput: {},
        power: 20,
        tick: tickPowerPlant,
    };
    GasPowerPlant: BuildingItem = {
        name: () => t("GasPowerPlant"),
        staticInput: { Gas: 1 },
        staticOutput: {},
        power: 15,
        tick: tickPowerPlant,
    };
    BiofuelPowerPlant: BuildingItem = {
        name: () => t("BiofuelPowerPlant"),
        staticInput: { Biofl: 1 },
        staticOutput: {},
        power: 15,
        tick: tickPowerPlant,
        available: () => D.map === "RioDeJaneiro",
    };
    WindTurbine: BuildingItem = {
        name: () => t("WindTurbine"),
        staticInput: {},
        staticOutput: {},
        power: 5,
        tick: tickPowerPlant,
        panel: () => ({
            view: () => m(".box.banner.blue.text-m", t("WindTurbineDesc")),
        }),
    };
    SolarPanel: BuildingItem = {
        name: () => t("SolarPanel"),
        staticInput: {},
        staticOutput: {},
        power: 10,
        tick: tickPowerPlant,
        panel: () => ({
            view: () => m(".box.banner.blue.text-m", t("SolarPanelDesc")),
        }),
    };
    GeothermalPowerPlant: BuildingItem = {
        name: () => t("GeothermalPowerPlant"),
        staticInput: {},
        staticOutput: {},
        power: 100,
        tick: (v) => {
            tickPowerPlant(v);
            boostAdjacentBuilding(v, getBoostPercentage(v.entity), (e) => getOutput(e).Steel > 0);
        },
        panel: () => {
            return {
                view: (vnode) => {
                    if (D.map !== "Perth") {
                        return null;
                    }
                    return m(
                        ".box.banner.text-m.blue",
                        t("PerthGeothermalPowerPlantBoost", {
                            boost: formatPercent(getBoostPercentage(vnode.attrs.entity)),
                        })
                    );
                },
            };
        },
        canBuildOnTile: (xy) => requireDeposit("GV", xy),
    };
    HydroPowerPlant: BuildingItem = {
        name: () => t("HydroPowerPlant"),
        staticInput: {},
        staticOutput: {},
        power: 100,
        tick: (v) => {
            if (isBuildingLevelTooHigh(v.entity)) {
                return;
            }
            tickPowerPlant(v);
        },
        canBuildOnTile: (xy) => requireDeposit("Water", xy),
    };
    /////////////////// Special ////////////////////
    Warehouse: BuildingItem = WarehouseDefinition();
    PowerBank: BuildingItem = PowerBankDefinition();
    ResourceExplorer: BuildingItem = ResourceExplorerDefinition();
    ResourceBooster: BuildingItem = ResourceBoosterDefinition();
    IndustryZone: BuildingItem = IndustryZoneDefinition();
    Dam: BuildingItem = DamDefinition();
    Farmland: BuildingItem = FarmlandDefinition();
    Greenhouse: BuildingItem = GreenhouseDefinition();
    CapacitorFactory: BuildingItem = {
        name: () => t("CapacitorFactory"),
        staticInput: {},
        staticOutput: { Cap: 1 },
        power: -CAPACITOR_SIZE,
        dlc: DLC[1],
        cost: 100,
        research: 100,
    };
    CristoRedentor: BuildingItem = {
        name: () => t("CristoRedentor"),
        input: (e) => {
            const count = T.buildingCount.CristoRedentor ?? 0;
            return { Cul: Math.pow(2, count) };
        },
        staticInput: {},
        staticOutput: {},
        power: -10,
        dlc: DLC[1],
        cost: 100,
        research: 100,
        available: () => D.map === "RioDeJaneiro",
        panel: () => {
            return {
                view: () => m(".box.banner.blue.text-m", t("CristoRedentorBanner")),
            };
        },
        desc: () => t("CristoRedentorDesc"),
    };
    /////////////////// Base Defense ////////////////////
    Wormhole: BuildingItem = {
        name: () => t("Wormhole"),
        staticInput: {},
        staticOutput: {},
        power: 5,
        tick: NOOP,
        builtin: true,
        page: WormholePage,
    };
    DefenseCommand: BuildingItem = DefenseCommandDefinition();
    /////////////////// Mines ////////////////////
    IronMine: BuildingItem = {
        name: () => t("IronMine"),
        staticInput: {},
        staticOutput: { Fe: 1 },
        power: -1,
        tick: tickMine,
        canBuildOnTile: (xy) => requireDeposit("Fe", xy),
    };
    LithiumMine: BuildingItem = {
        name: () => t("LithiumMine"),
        staticInput: {},
        staticOutput: { Li: 1 },
        power: -1,
        tick: tickMine,
        canBuildOnTile: (xy) => requireDeposit("Li", xy),
    };
    ChromiumMine: BuildingItem = {
        name: () => t("ChromiumMine"),
        staticInput: {},
        staticOutput: { Cr: 1 },
        power: -1,
        tick: tickMine,
        canBuildOnTile: (xy) => requireDeposit("Cr", xy),
    };
    TitaniumMine: BuildingItem = {
        name: () => t("TitaniumMine"),
        staticInput: {},
        staticOutput: { Ti: 1 },
        power: -1,
        tick: tickMine,
        canBuildOnTile: (xy) => requireDeposit("Ti", xy),
    };
    UraniumMine: BuildingItem = {
        name: () => t("UraniumMine"),
        staticInput: {},
        staticOutput: { U: 1 },
        power: -5,
        tick: tickMine,
        canBuildOnTile: (xy) => requireDeposit("U", xy),
    };
    CoalMine: BuildingItem = {
        name: () => t("CoalMine"),
        staticInput: {},
        staticOutput: { Coal: 1 },
        power: -1,
        tick: tickMine,
        canBuildOnTile: (xy) => requireDeposit("Coal", xy),
    };
    CopperMine: BuildingItem = {
        name: () => t("CopperMine"),
        staticInput: {},
        staticOutput: { Cu: 1 },
        power: -1,
        tick: tickMine,
        canBuildOnTile: (xy) => requireDeposit("Cu", xy),
    };
    SiliconMine: BuildingItem = {
        name: () => t("SiliconMine"),
        staticInput: {},
        staticOutput: { Si: 1 },
        power: -1,
        tick: tickMine,
        canBuildOnTile: (xy) => requireDeposit("Si", xy),
    };
    AluminumMine: BuildingItem = {
        name: () => t("AluminumMine"),
        staticInput: {},
        staticOutput: { Al: 1 },
        power: -1,
        tick: tickMine,
        canBuildOnTile: (xy) => requireDeposit("Al", xy),
    };
    OilWell: BuildingItem = {
        name: () => t("OilWell"),
        staticInput: {},
        staticOutput: { Oil: 1 },
        power: -1,
        tick: tickMine,
        canBuildOnTile: (xy) => requireDeposit("Oil", xy),
    };
    LoggingCamp: BuildingItem = {
        name: () => t("LoggingCamp"),
        staticInput: {},
        staticOutput: { Wood: 1 },
        power: -1,
        tick: tickMine,
        canBuildOnTile: (xy) => requireDeposit("Wood", xy),
    };
    GasPump: BuildingItem = {
        name: () => t("GasPump"),
        staticInput: {},
        staticOutput: { Gas: 1 },
        power: -2,
        tick: tickMine,
        canBuildOnTile: (xy) => requireDeposit("Gas", xy),
    };
    WaterPump: BuildingItem = {
        name: () => t("WaterPump"),
        staticInput: {},
        staticOutput: { Water: 1 },
        power: -2,
        tick: tickMine,
        canBuildOnTile: (xy) => requireDeposit("Water", xy),
        panel: () => {
            return {
                view: (vnode) => {
                    return isBuildingLevelTooHigh(vnode.attrs.entity)
                        ? m(".box.banner.text-m", t("WaterEntityLevelTooHighDesc"))
                        : null;
                },
            };
        },
    };
    /////////////////// Map-specific Buildings ////////////////////
    MangaPublisher: BuildingItem = {
        name: () => t("MangaPublisher"),
        staticInput: { Book: 5, Paper: 5, Fas: 5 },
        staticOutput: { Mga: 1 },
        power: -2,
        available: () => D.map === "Osaka",
    };
    AnimeStudio: BuildingItem = {
        name: () => t("AnimeStudio"),
        staticInput: { Mus: 5, Sitcom: 5, Movie: 5, Fas: 5 },
        staticOutput: { Anm: 1, Cul: 10 },
        power: -2,
        available: () => D.map === "Osaka",
    };
    KungFuDojo: BuildingItem = {
        name: () => t("KungFuDojo"),
        staticInput: { Santa: 5, Art: 5, Fas: 5 },
        staticOutput: { Kfu: 1 },
        power: -5,
        available: () => D.map === "HongKong",
    };
    TaiChiDojo: BuildingItem = {
        name: () => t("TaiChiDojo"),
        staticInput: { Kfu: 10, Movie: 10, Roc: 10 },
        staticOutput: { Tai: 1, Cul: 10 },
        power: -25,
        available: () => D.map === "HongKong",
    };
    MapleSyrupFactory: BuildingItem = {
        name: () => t("MapleSyrupFactory"),
        staticInput: { Wood: 2 },
        staticOutput: { MpSy: 2 },
        power: -2,
        available: () => D.map === "Vancouver",
    };
    /////////////////// Built-in Buildings ////////////////////
    Headquarter: BuildingItem = {
        name: () => t("Headquarter"),
        staticInput: {},
        staticOutput: {},
        power: 0,
        builtin: true,
        page: HeadquarterPage,
    };
    CentralBank: BuildingItem = {
        name: () => t("CentralBank"),
        staticInput: {},
        staticOutput: {},
        power: 0,
        builtin: true,
        page: CentralBankPage,
    };
    ResearchLab: BuildingItem = {
        name: () => t("ResearchLab"),
        staticInput: { Sci: 10 },
        staticOutput: { RP: 1 },
        power: 0,
        builtin: true,
        page: ResearchPage,
    };
    TradeCenter: BuildingItem = TradeCenterDefinition();
    WholesaleCenter: BuildingItem = {
        name: () => t("WholesaleCenter"),
        staticInput: {},
        staticOutput: {},
        power: 0,
        builtin: true,
        page: WholesaleCenterPage,
    };
    PolicyCenter: BuildingItem = {
        name: () => t("PolicyCenter"),
        staticInput: { Cul: 10 },
        staticOutput: { PP: 1 },
        power: 0,
        builtin: true,
        page: PolicyCenterPage,
    };
    LogisticsDepartment: BuildingItem = {
        name: () => t("LogisticsDepartment"),
        staticInput: {},
        staticOutput: {},
        power: 0,
        builtin: true,
        page: LogisticsDepartmentPage,
    };
    SwissShop: BuildingItem = {
        name: () => t("SwissShop"),
        staticInput: {},
        staticOutput: {},
        power: 0,
        builtin: true,
        page: SwissShopPage,
    };
    StatisticsCenter: BuildingItem = {
        name: () => t("StatisticsBureau"),
        staticInput: {},
        staticOutput: {},
        power: 0,
        builtin: true,
        page: StatPage,
    };
}

function reverse(bld: BuildingItem): BuildingItem {
    return { ...bld, staticInput: bld.staticOutput, staticOutput: bld.staticInput, ignoreForPricing: true };
}
