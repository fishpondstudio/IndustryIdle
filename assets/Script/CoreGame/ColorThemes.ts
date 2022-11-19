import { D } from "../General/GameData";
import { hasValue } from "../General/Helper";
import { isSteam, steamworks } from "../General/NativeSdk";
import { Buildings } from "./Buildings/BuildingDefinitions";

const COLOR_GREEN = cc.color().fromHEX("#2ecc71");
const COLOR_RED = cc.color().fromHEX("#e74c3c");
const COLOR_ORANGE = cc.color().fromHEX("#f39c12");

class ColorThemes {
    Blue: IColorTheme = {
        name: "Blueprint",
        background: cc.color().fromHEX("#34495E"),
        grid: cc.color().fromHEX("4F6376"),
        gridSelected: cc.color().fromHEX("#f39c12").setA(100),
        building: cc.color().fromHEX("#ffffff"),
        buildingSelected: cc.color().fromHEX("#f39c12"),
        hq: cc.color().fromHEX("#74b9ff"),
        red: COLOR_RED,
        green: COLOR_GREEN,
        orange: COLOR_ORANGE,
        panelBackgroundOverride: cc.color().fromHEX("#ffffff"),
        panelForegroundOverride: cc.color().fromHEX("#33333"),
        modifierOverlayMin: cc.color().fromHEX("#ff7675"),
        modifierOverlayMax: cc.color().fromHEX("#55efc4"),
    };
    Black: IColorTheme = {
        name: "Monokai",
        background: cc.color().fromHEX("#272822"),
        grid: cc.color().fromHEX("#4C4E44"),
        gridSelected: cc.color().fromHEX("#A1E245").setA(100),
        building: cc.color().fromHEX("#f8f8f2"),
        buildingSelected: cc.color().fromHEX("#A1E245"),
        hq: cc.color().fromHEX("#FF2773"),
        red: COLOR_RED,
        green: COLOR_GREEN,
        orange: COLOR_ORANGE,
        modifierOverlayMin: cc.color().fromHEX("#ff7675"),
        modifierOverlayMax: cc.color().fromHEX("#55efc4"),
    };
    Dracula: IColorTheme = {
        name: "Dracula",
        background: cc.color().fromHEX("#282a36"),
        grid: cc.color().fromHEX("#4F515C"),
        gridSelected: cc.color().fromHEX("#8be9fd").setA(100),
        building: cc.color().fromHEX("#f8f8f2"),
        buildingSelected: cc.color().fromHEX("#8be9fd"),
        hq: cc.color().fromHEX("#bd93f9"),
        red: COLOR_RED,
        green: COLOR_GREEN,
        orange: COLOR_ORANGE,
        dlc: true,
        modifierOverlayMin: cc.color().fromHEX("#ff7675"),
        modifierOverlayMax: cc.color().fromHEX("#55efc4"),
    };
    SolarizedLight: IColorTheme = {
        name: "Solarized Light",
        background: cc.color().fromHEX("#FDF6E3"),
        grid: cc.color().fromHEX("#EEE8D5"),
        gridSelected: cc.color().fromHEX("#D33682").setA(100),
        building: cc.color().fromHEX("#657B83"),
        buildingSelected: cc.color().fromHEX("#D33682"),
        hq: cc.color().fromHEX("#268BD2"),
        barBackgroundOverride: cc.color().fromHEX("#073642"),
        barForegroundOverride: cc.color().fromHEX("#FDF6E3"),
        red: COLOR_RED,
        green: COLOR_GREEN,
        orange: COLOR_ORANGE,
        modifierOverlayMin: cc.color().fromHEX("#ff7675"),
        modifierOverlayMax: cc.color().fromHEX("#55efc4"),
    };
    SolarizedDark: IColorTheme = {
        name: "Solarized Dark",
        background: cc.color().fromHEX("#002B36"),
        grid: cc.color().fromHEX("#1C4651"),
        gridSelected: cc.color().fromHEX("#D33682").setA(150),
        building: cc.color().fromHEX("#93A1A1"),
        buildingSelected: cc.color().fromHEX("#D33682"),
        hq: cc.color().fromHEX("#268BD2"),
        red: COLOR_RED,
        green: COLOR_GREEN,
        orange: COLOR_ORANGE,
        dlc: true,
        modifierOverlayMin: cc.color().fromHEX("#ff7675"),
        modifierOverlayMax: cc.color().fromHEX("#55efc4"),
    };
    GithubLight: IColorTheme = {
        name: "Github Light",
        background: cc.color(255, 255, 255),
        grid: cc.color(225, 228, 232),
        gridSelected: cc.color(0, 92, 197).setA(150),
        building: cc.color(36, 41, 46),
        buildingSelected: cc.color(0, 92, 197),
        hq: cc.color(111, 66, 193),
        red: COLOR_RED,
        green: COLOR_GREEN,
        orange: COLOR_ORANGE,
        barBackgroundOverride: cc.color(36, 41, 46),
        barForegroundOverride: cc.color(255, 255, 255),
        dlc: true,
        modifierOverlayMin: cc.color().fromHEX("#ff7675"),
        modifierOverlayMax: cc.color().fromHEX("#55efc4"),
    };
}

export const COLORS = Object.freeze(new ColorThemes());

export interface IColorTheme {
    name: string;
    background: cc.Color;
    grid: cc.Color;
    gridSelected: cc.Color;
    building: cc.Color;
    buildingSelected: cc.Color;
    hq: cc.Color;
    red: cc.Color;
    orange: cc.Color;
    green: cc.Color;
    barForegroundOverride?: cc.Color;
    barBackgroundOverride?: cc.Color;
    panelBackgroundOverride?: cc.Color;
    panelForegroundOverride?: cc.Color;
    dlc?: boolean;
    modifierOverlayMin?: cc.Color;
    modifierOverlayMax?: cc.Color;
}

let color = COLORS.Blue;

export function getCurrentColor() {
    return color;
}

export function setCurrentColor(colorTheme: IColorTheme) {
    color = colorTheme;
    if (isSteam()) {
        steamworks.setNativeTheme(isDarkTheme() ? "dark" : "light");
    }
}

export function isDarkTheme() {
    if (color.panelBackgroundOverride) {
        return (
            color.panelBackgroundOverride.r < 255 / 2 &&
            color.panelBackgroundOverride.g < 255 / 2 &&
            color.panelBackgroundOverride.b < 255 / 2
        );
    }
    return color.background.r < 255 / 2 && color.background.g < 255 / 2 && color.background.b < 255 / 2;
}

export function getBuildingColor(b: keyof Buildings): string {
    if (D.persisted.buildingColors[b]) {
        return D.persisted.buildingColors[b];
    }
    return getCurrentColor().building.toCSS("#rrggbb");
}

export function setBuildingColor(b: keyof Buildings, color: string): void {
    D.persisted.buildingColors[b] = color;
}

export function resetBuildingColor(b: keyof Buildings): void {
    delete D.persisted.buildingColors[b];
}

export function buildingHasColor(b: keyof Buildings): boolean {
    return hasValue(D.persisted.buildingColors[b]);
}

export const DOT_OPACITY_DEFAULT = 100;
export const DOT_OPACITY_ENHANCED = 150;
export const DOT_OPACITY_FADED = 50;
export const DOT_OPACITY_HIGHLIGHT = 255;
