const { readFileSync, writeFileSync } = require("fs");

const configPath = "build-templates/web-mobile/config.json";
const config = JSON.parse(readFileSync(configPath, { encoding: "utf-8" }));

const version = process.argv[2];
if (version) {
  config.version = version;
  writeFileSync(configPath, JSON.stringify(config, null, 4));
} else {
  console.log("No version specified, skip updating version");
}
console.log("Config:", config);

const buildNumberFile = "assets/Script/General/BuildNumber.ts";
const buildNumber = readFileSync(buildNumberFile, { encoding: "utf-8" })
  .replace('export const BUILD_NUMBER = "', "")
  .replace('";', "");
const newBuildNumber = parseInt(buildNumber, 10) + 1;
console.log("Build Number:", newBuildNumber);
writeFileSync(
  buildNumberFile,
  `export const BUILD_NUMBER = "${newBuildNumber}";`
);

eval(
  readFileSync("assets/Script/CoreGame/Changelog.ts", {
    encoding: "utf-8",
  }).replace("export const CHANGELOG", "var changelog")
);

writeFileSync(
  "build-templates/web-mobile/changelog.json",
  JSON.stringify(changelog, null, 4)
);
