"use strict";

const { exec } = require("child_process");
const path = require("path");
const os = require('os');

module.exports = {
    load() {
        Editor.Builder.on("before-change-files", onBeforeBuildFinish);
    },
    unload() {
        Editor.Builder.removeListener("before-change-files", onBeforeBuildFinish);
    },
};

function onBeforeBuildFinish(options, callback) {
    if (options.buildResults) {
        processBuildResult(options.buildResults, callback);
    } else if (options.bundles) {
        options.bundles.forEach((bundle) => processBuildResult(bundle.buildResults, callback));
    }
}

let count = 0;

let ext = "";

if (os.platform() === "win32") {
    ext = ".exe"
}

function processBuildResult(buildResults, callback) {
    let assets = buildResults.getAssetUuids();
    for (let i = 0; i < assets.length; ++i) {
        const file = buildResults.getNativeAssetPath(assets[i]);
        if (file.endsWith(".png")) {
            count++;
            const cmd = `${path.join(__dirname, `pngquant${ext}`)} --force --ext .png --strip --skip-if-larger ${file}`;
            exec(cmd, (err) => {
                if (err && err.code !== 98) {
                    Editor.warn(err);
                } else {
                    Editor.success("pngquant: " + file);
                }
                if (--count === 0) {
                    callback();
                }
            });
            Editor.success("pngquant: " + file);
        } else if (file.endsWith(".jpg") || file.endsWith(".jpeg")) {
            count++;
            const cmd = `${path.join(__dirname, `jpegtran${ext}`)} -optimize -progressive -outfile ${file} ${file}`;
            exec(cmd, (err) => {
                if (err) {
                    Editor.warn(err);
                } else {
                    Editor.success("jpegtran: " + file);
                }
                if (--count === 0) {
                    callback();
                }
            });
        }
    }
}
