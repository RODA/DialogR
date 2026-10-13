"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { readDialogScriptSource } = require("../dialogScriptSource");

const productRoot = path.resolve(__dirname, "../..");
const dialogDirectory = path.join(productRoot, "dialogs/r/anovahv");
const source = JSON.parse(fs.readFileSync(path.join(dialogDirectory, "dialog.json"), "utf8"));
const expected = fs.readFileSync(path.join(dialogDirectory, "actions.js"), "utf8");

for (const sourceFile of [
    "dialogs/r/anovahv/dialog.json",
    "dialogs\\r\\anovahv\\dialog.json",
    "r/anovahv/dialog.json",
    "r\\anovahv\\dialog.json"
]) {
    assert.equal(readDialogScriptSource(productRoot, sourceFile, source), expected, sourceFile);
}

console.log("Dialog script source paths verified with POSIX and Windows separators.");
