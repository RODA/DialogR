"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { readDialogSourceSummary } = require(require("../dialogforge").dialogForgeModule("shared/dialog-runtime/dialogSource"));
const { createDialogRuntimePlan } = require(require("../dialogforge").dialogForgeModule("shared/dialog-runtime/custom-js/dialogRuntimePlan"));
const { createDialogExternalCallHost } = require(require("../dialogforge").dialogForgeModule("shared/dialog-runtime/custom-js/externalCallHost"));
const rootDir = path.resolve(__dirname, "../..");
const host = createDialogExternalCallHost();
const registry = JSON.parse(fs.readFileSync(path.join(rootDir, "dialogs/dialogs.json"), "utf8"));
registry.forEach((dialog) => {
    const source = readDialogSourceSummary(rootDir, dialog);
    const plan = createDialogRuntimePlan(source, host);
    assert.deepStrictEqual(plan.externalCalls.unsupported, [], `DialogR/${dialog.id} has unsupported external calls.`);
});
console.log("DialogR external-call coverage verified.");
