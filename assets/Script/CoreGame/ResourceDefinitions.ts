import { extrapolate } from "../General/Helper";
import { t } from "../General/i18n";
import { Item } from "./Logic/Logic";

export interface ResourceItem extends Item {
    fuelCost: number;
    getPrice?: (averageDepositPrice: number, random: () => number) => number;
}

export const CAPACITOR_SIZE = 100;

export class Resources {

    // Special
    Cap: ResourceItem = {
        name: () => t("Capacitor"),
        fuelCost: 1,
        getPrice: (adp, random) => {
            return (extrapolate(random(), 0.5, 2) * (adp * CAPACITOR_SIZE)) / 15;
        },
    };
    Cash: ResourceItem = { name: () => t("Cash"), fuelCost: 1 };
    Cul: ResourceItem = { name: () => t("Culture"), fuelCost: 0 };
    Dmg: ResourceItem = { name: () => t("Damage"), fuelCost: 0 };
    GV: ResourceItem = { name: () => t("GV"), fuelCost: 0 };
    PP: ResourceItem = { name: () => t("PolicyPoint"), fuelCost: 0 };
    Rndr: ResourceItem = { name: () => t("Reindeer"), fuelCost: 1 };
    RP: ResourceItem = { name: () => t("ResearchPoint"), fuelCost: 0 };
    Santa: ResourceItem = { name: () => t("Santa"), fuelCost: 1 };
    Sci: ResourceItem = { name: () => t("Science"), fuelCost: 0 };

    // Raw Food
    Beef: ResourceItem = { name: () => t("Beef"), fuelCost: 1 };
    Chkn: ResourceItem = { name: () => t("Chicken"), fuelCost: 1 };
    Cocoa: ResourceItem = { name: () => t("Cocoa"), fuelCost: 1 };
    Coffe: ResourceItem = { name: () => t("Coffee"), fuelCost: 1 };
    Corn: ResourceItem = { name: () => t("Corn"), fuelCost: 1 };
    Egg: ResourceItem = { name: () => t("Egg"), fuelCost: 1 };
    Milk: ResourceItem = { name: () => t("Milk"), fuelCost: 1 };
    MpSy: ResourceItem = { name: () => t("MapleSyrup"), fuelCost: 0 };
    Pork: ResourceItem = { name: () => t("Pork"), fuelCost: 1 };
    Rice: ResourceItem = { name: () => t("Rice"), fuelCost: 1 };
    Sgcn: ResourceItem = { name: () => t("Sugarcane"), fuelCost: 1 };
    Soy: ResourceItem = { name: () => t("Soybean"), fuelCost: 1 };
    Vege: ResourceItem = { name: () => t("Vegetable"), fuelCost: 1 };
    Wheat: ResourceItem = { name: () => t("Wheat"), fuelCost: 1 };

    // Processed Food
    Alchl: ResourceItem = { name: () => t("Alcohol"), fuelCost: 1 };
    Bread: ResourceItem = { name: () => t("Bread"), fuelCost: 1 };
    Brgr: ResourceItem = { name: () => t("Burger"), fuelCost: 1 };
    Bttr: ResourceItem = { name: () => t("Butter"), fuelCost: 1 };
    Cake: ResourceItem = { name: () => t("Cake"), fuelCost: 1 };
    CBeef: ResourceItem = { name: () => t("CannedBeef"), fuelCost: 1 };
    CcoPd: ResourceItem = { name: () => t("CocoaPowder"), fuelCost: 1 };
    CFish: ResourceItem = { name: () => t("CannedFish"), fuelCost: 1 };
    Chees: ResourceItem = { name: () => t("Cheese"), fuelCost: 1 };
    Cki: ResourceItem = { name: () => t("Cookie"), fuelCost: 1 };
    Cktl: ResourceItem = { name: () => t("Cocktail"), fuelCost: 1 };
    Fish: ResourceItem = { name: () => t("Fish"), fuelCost: 5 };
    Flour: ResourceItem = { name: () => t("Flour"), fuelCost: 1 };
    Fodr: ResourceItem = { name: () => t("Fodder"), fuelCost: 1 };
    FPork: ResourceItem = { name: () => t("FrozenPork"), fuelCost: 1 };
    FrCkn: ResourceItem = { name: () => t("FriedChicken"), fuelCost: 1 };
    FrRi: ResourceItem = { name: () => t("FriedRice"), fuelCost: 1 };
    FVege: ResourceItem = { name: () => t("FrozenVegetable"), fuelCost: 1 };
    FzCkn: ResourceItem = { name: () => t("FrozenChicken"), fuelCost: 1 };
    HpyMl: ResourceItem = { name: () => t("HappyMeal"), fuelCost: 1 };
    Htdg: ResourceItem = { name: () => t("Hotdog"), fuelCost: 1 };
    Meal3: ResourceItem = { name: () => t("ThreeCourseMeal"), fuelCost: 1 };
    Meal6: ResourceItem = { name: () => t("SixCourseMeal"), fuelCost: 1 };
    Meal9: ResourceItem = { name: () => t("NineCourseMeal"), fuelCost: 1 };
    MlkPd: ResourceItem = { name: () => t("MilkPowder"), fuelCost: 1 };
    Pastry: ResourceItem = { name: () => t("Pastry"), fuelCost: 1 };
    Pizza: ResourceItem = { name: () => t("Pizza"), fuelCost: 1 };
    Pmkpi: ResourceItem = { name: () => t("PumpkinPie"), fuelCost: 1 };
    Pmpk: ResourceItem = { name: () => t("Pumpkin"), fuelCost: 1 };
    PSL: ResourceItem = { name: () => t("PumpkinSpiceLatte"), fuelCost: 1 };
    RfSgr: ResourceItem = { name: () => t("RefinedSugar"), fuelCost: 1 };
    SftDk: ResourceItem = { name: () => t("SoftDrink"), fuelCost: 1 };
    Ssg: ResourceItem = { name: () => t("Sausage"), fuelCost: 1 };
    Sushi: ResourceItem = { name: () => t("Sushi"), fuelCost: 1 };
    Swch: ResourceItem = { name: () => t("Sandwich"), fuelCost: 1 };
    Whppr: ResourceItem = { name: () => t("Whopper"), fuelCost: 1 };
    Wine: ResourceItem = { name: () => t("Wine"), fuelCost: 1 };

    // Raw Resources
    Al: ResourceItem = { name: () => t("Aluminum"), fuelCost: 1 };
    Coal: ResourceItem = { name: () => t("Coal"), fuelCost: 1 };
    Cr: ResourceItem = { name: () => t("Chromium"), fuelCost: 2 };
    Cu: ResourceItem = { name: () => t("Copper"), fuelCost: 1 };
    ErU: ResourceItem = { name: () => t("EnrichedUranium"), fuelCost: 10 };
    Fe: ResourceItem = { name: () => t("Iron"), fuelCost: 1 };
    Gas: ResourceItem = { name: () => t("Gas"), fuelCost: 0.5 };
    Li: ResourceItem = { name: () => t("Lithium"), fuelCost: 1 };
    Oil: ResourceItem = { name: () => t("Oil"), fuelCost: 0.5 };
    Si: ResourceItem = { name: () => t("Silicon"), fuelCost: 1 };
    Ti: ResourceItem = { name: () => t("Titanium"), fuelCost: 5 };
    U: ResourceItem = { name: () => t("Uranium"), fuelCost: 5 };
    Water: ResourceItem = { name: () => t("Water"), fuelCost: 1 };
    Wood: ResourceItem = { name: () => t("Wood"), fuelCost: 1 };

    // Refined Resources
    Biofl: ResourceItem = { name: () => t("Biofuel"), fuelCost: 1 };
    Fib: ResourceItem = { name: () => t("Fiber"), fuelCost: 1 };
    Glass: ResourceItem = { name: () => t("Glass"), fuelCost: 1 };
    Lumb: ResourceItem = { name: () => t("Lumber"), fuelCost: 1 };
    Paper: ResourceItem = { name: () => t("Paper"), fuelCost: 1 };
    Petrol: ResourceItem = { name: () => t("Petrol"), fuelCost: 1 };
    Pla: ResourceItem = { name: () => t("Plastic"), fuelCost: 1 };
    Pplt: ResourceItem = { name: () => t("Propellant"), fuelCost: 1 };
    Steel: ResourceItem = { name: () => t("Steel"), fuelCost: 1 };

    // Industrial
    Abom: ResourceItem = { name: () => t("AtomicBomb"), fuelCost: 1 };
    Art: ResourceItem = { name: () => t("Artillery"), fuelCost: 1 };
    Bat: ResourceItem = { name: () => t("Battery"), fuelCost: 1 };
    BatSl: ResourceItem = { name: () => t("BatteryShell"), fuelCost: 1 };
    Dynm: ResourceItem = { name: () => t("Dynamite"), fuelCost: 1 };
    Eng: ResourceItem = { name: () => t("Engine"), fuelCost: 1 };
    ICBM: ResourceItem = { name: () => t("ICBM"), fuelCost: 1 };
    Jet: ResourceItem = { name: () => t("JetEngine"), fuelCost: 1 };
    Mis: ResourceItem = { name: () => t("Missile"), fuelCost: 1 };
    Nmis: ResourceItem = { name: () => t("NuclearMissile"), fuelCost: 1 };
    Roc: ResourceItem = { name: () => t("Rocket"), fuelCost: 1 };
    Scr: ResourceItem = { name: () => t("Screen"), fuelCost: 1 };

    // Products
    Anm: ResourceItem = { name: () => t("Anime"), fuelCost: 0 };
    Book: ResourceItem = { name: () => t("Book"), fuelCost: 1 };
    Cam: ResourceItem = { name: () => t("Camera"), fuelCost: 1 };
    Clo: ResourceItem = { name: () => t("Clothes"), fuelCost: 1 };
    Dru: ResourceItem = { name: () => t("Drum"), fuelCost: 1 };
    Fas: ResourceItem = { name: () => t("Fashion"), fuelCost: 1 };
    Game: ResourceItem = { name: () => t("Game"), fuelCost: 0 };
    Gui: ResourceItem = { name: () => t("Guitar"), fuelCost: 1 };
    Gun: ResourceItem = { name: () => t("Gun"), fuelCost: 1 };
    Kfu: ResourceItem = { name: () => t("KungFu"), fuelCost: 0.5 };
    Ltrn: ResourceItem = { name: () => t("Lantern"), fuelCost: 1 };
    Mga: ResourceItem = { name: () => t("Manga"), fuelCost: 1 };
    Movie: ResourceItem = { name: () => t("Movie"), fuelCost: 0 };
    Mus: ResourceItem = { name: () => t("Music"), fuelCost: 0 };
    Phone: ResourceItem = { name: () => t("Phone"), fuelCost: 1 };
    Sho: ResourceItem = { name: () => t("Shoes"), fuelCost: 1 };
    Sitcom: ResourceItem = { name: () => t("Sitcom"), fuelCost: 0 };
    Tai: ResourceItem = { name: () => t("TaiChi"), fuelCost: 0.5 };
    Toy: ResourceItem = { name: () => t("Toy"), fuelCost: 1 };
    Video: ResourceItem = { name: () => t("Video"), fuelCost: 0 };

    // Technology
    Bit: ResourceItem = { name: () => t("Bitcoin"), fuelCost: 0 };
    CldSm: ResourceItem = { name: () => t("CloudStreaming"), fuelCost: 0 };
    Con: ResourceItem = { name: () => t("Console"), fuelCost: 1 };
    DB: ResourceItem = { name: () => t("Database"), fuelCost: 0 };
    Doge: ResourceItem = { name: () => t("Dogecoin"), fuelCost: 0 };
    IC: ResourceItem = { name: () => t("IntegratedCircuit"), fuelCost: 1 };
    OS: ResourceItem = { name: () => t("OperatingSystem"), fuelCost: 0 };
    PC: ResourceItem = { name: () => t("PC"), fuelCost: 1 };
    QtCp: ResourceItem = { name: () => t("QuantumComputer"), fuelCost: 1 };
    Radar: ResourceItem = { name: () => t("Radar"), fuelCost: 1 };
    RbCar: ResourceItem = { name: () => t("Robocar"), fuelCost: 1 };
    Rob: ResourceItem = { name: () => t("Robot"), fuelCost: 1 };
    Sat: ResourceItem = { name: () => t("Satellite"), fuelCost: 1 };
    SE: ResourceItem = { name: () => t("SearchEngine"), fuelCost: 0 };
    Sem: ResourceItem = { name: () => t("Semiconductor"), fuelCost: 1 };
    SkyNt: ResourceItem = { name: () => t("SkyNet"), fuelCost: 0 };
    Soft: ResourceItem = { name: () => t("Software"), fuelCost: 0 };
    SuCp: ResourceItem = { name: () => t("SuperComputer"), fuelCost: 1 };
    WWW: ResourceItem = { name: () => t("Internet"), fuelCost: 0 };

    // Vehicles
    Air: ResourceItem = { name: () => t("Aircraft"), fuelCost: 1 };
    Btshp: ResourceItem = { name: () => t("Battleship"), fuelCost: 1 };
    Car: ResourceItem = { name: () => t("Car"), fuelCost: 1 };
    Crr: ResourceItem = { name: () => t("AircraftCarrier"), fuelCost: 5 };
    Hel: ResourceItem = { name: () => t("Helicopter"), fuelCost: 1 };
    ISS: ResourceItem = { name: () => t("SpaceStation"), fuelCost: 1 };
    Ship: ResourceItem = { name: () => t("Ship"), fuelCost: 1 };
    Spa: ResourceItem = { name: () => t("Spaceship"), fuelCost: 1 };
    StFgt: ResourceItem = { name: () => t("StealthFighter"), fuelCost: 1 };
    Sub: ResourceItem = { name: () => t("Submarine"), fuelCost: 1 };
    Tank: ResourceItem = { name: () => t("Tank"), fuelCost: 1 };
    Tra: ResourceItem = { name: () => t("Train"), fuelCost: 1 };
    Zep: ResourceItem = { name: () => t("Zeppelin"), fuelCost: 1 };

    // Organizations
    AirFc: ResourceItem = { name: () => t("AirForce"), fuelCost: 1 };
    Army: ResourceItem = { name: () => t("Army"), fuelCost: 1 };
    Navy: ResourceItem = { name: () => t("Navy"), fuelCost: 1 };
    SNS: ResourceItem = { name: () => t("SocialNetwork"), fuelCost: 0 };
    SpCo: ResourceItem = { name: () => t("SpaceColony"), fuelCost: 1 };
    SpFc: ResourceItem = { name: () => t("SpaceForce"), fuelCost: 1 };
}
