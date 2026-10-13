"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { readDialogScriptSource } = require("../dialogScriptSource");
const { createDialogControlModelFromSources, getDialogControl } = require(require("../dialogforge").dialogForgeModule("shared/dialog-runtime/custom-js/dialogControlModel"));
const { createDialogRuntimeHarness } = require(require("../dialogforge").dialogForgeModule("shared/dialog-runtime/custom-js/dialogRuntimeHarness"));
const { createDialogScriptRunner, listDialogScriptControlReferences } = require(require("../dialogforge").dialogForgeModule("shared/dialog-runtime/custom-js/dialogScriptRunner"));
const { createDialogExternalCallHost } = require(require("../dialogforge").dialogForgeModule("shared/dialog-runtime/custom-js/externalCallHost"));
const rootDir = path.resolve(__dirname, "../..");
const { readDialogControls, setDialogControlChecked, setDialogControlSelected, setDialogControlValue } = require("../dialogControls");
const verifySortByCommand = async function () {
    const source = JSON.parse(fs.readFileSync(path.join(rootDir, "dialogs/r/sortby/dialog.json"), "utf8"));
    const customJS = readDialogScriptSource(rootDir, "dialogs/r/sortby/dialog.json", source);
    const commands = [];
    const refreshedDatasets = [];
    const model = createDialogControlModelFromSources(readDialogControls(source));
    const runner = createDialogScriptRunner({
        model,
        harness: createDialogRuntimeHarness({
            externalCallHost: createDialogExternalCallHost({
                datasets: [
                    { name: "survey", columns: ["id", "group", "score"] }
                ]
            })
        }),
        afterExternalCall: async function (name, parameters, value) {
            if (value && typeof value === "object") {
                const refreshDatasetName = String(value.refreshDatasetName || "");
                if (refreshDatasetName) {
                    refreshedDatasets.push(refreshDatasetName);
                }
            }
        },
        controlNames: listDialogScriptControlReferences(customJS),
        listObjects: function (kind) {
            return kind === "datasets" ? ["survey"] : [];
        },
        listColumns: function (objectName) {
            return objectName === "survey" ? ["id", "group", "score"] : [];
        },
        enableSearch: function () {
            return undefined;
        },
        resetDialog: function () {
            return undefined;
        },
        runCommand: async function (command) {
            commands.push(String(command || ""));
            return { ok: true };
        }
    });
    const setup = await runner.run(customJS);
    assert.strictEqual(setup.status, "ready");
    assert.deepStrictEqual(getDialogControl(model, "c_datasets").value, ["survey"]);
    setDialogControlSelected(model, "c_datasets", ["survey"]);
    assert.strictEqual((await runner.trigger("change", "c_datasets")).status, "ready");
    assert.deepStrictEqual(getDialogControl(model, "c_variables").value, ["id", "group", "score"]);
    setDialogControlSelected(model, "c_variables", ["score"]);
    assert.strictEqual((await runner.trigger("change", "c_variables")).status, "ready");
    assert.strictEqual((await runner.trigger("click", "addremove")).status, "ready");
    assert.deepStrictEqual(getDialogControl(model, "c_sorting").value, ["score"]);
    assert.deepStrictEqual(getDialogControl(model, "c_variables").value, ["id", "group"]);
    assert.strictEqual(getDialogControl(model, "__syntaxCommand").value, "survey <- survey[order(survey$score), ]\n");
    setDialogControlChecked(model, "cb_new", true);
    assert.strictEqual((await runner.trigger("change", "cb_new")).status, "ready");
    setDialogControlValue(model, "dsname", "sorted_survey");
    assert.strictEqual((await runner.trigger("change", "dsname")).status, "ready");
    assert.strictEqual(getDialogControl(model, "__syntaxCommand").value, "sorted_survey <- survey[order(survey$score), ]\n");
    assert.strictEqual((await runner.trigger("click", "b_run")).status, "ready");
    assert.deepStrictEqual(commands, [
        "sorted_survey <- survey[order(survey$score), ]\n"
    ]);
    assert.deepStrictEqual(refreshedDatasets, ["sorted_survey"]);
};
verifySortByCommand()
    .then(() => {
    console.log("DialogR sort-by source dialog verified.");
})
    .catch((error) => {
    console.error(error);
    process.exit(1);
});
