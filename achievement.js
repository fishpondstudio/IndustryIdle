const { readdirSync, readFileSync, existsSync } = require("fs");
const { execSync, spawn } = require("child_process");
const path = require("path");

const STEAM_ACHIEVEMENTS = JSON.parse(readFileSync("./steam-achievements.json", { encoding: "utf8" }));

const dir = "achievements/";
const result = readdirSync(dir);
result.forEach((p) => {
    if (p.endsWith(".png") && !p.endsWith("_.png")) {
        const target = path.join(dir, p.replace(".png", "_.png"));
        if (!existsSync(target)) {
            execSync(`magick ${path.join(dir, p)} -colorspace Gray ${target}`);
        }
    }
});

const achievements = {};
STEAM_ACHIEVEMENTS.achievements.forEach((item) => {
    achievements[item.api_name] = [item.icon, item.icon_gray];
});

console.log(achievements);
