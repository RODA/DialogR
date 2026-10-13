"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const productRoot = path.resolve(__dirname, "..");
const testDirectory = path.join(productRoot, "tests/dialog-runtime");

for (const name of fs.readdirSync(testDirectory).filter((name) => name.endsWith(".js")).sort()) {
    const result = spawnSync(process.execPath, [path.join(testDirectory, name)], {
        cwd: productRoot,
        stdio: "inherit"
    });

    if (result.error) {
        throw result.error;
    }
    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}
