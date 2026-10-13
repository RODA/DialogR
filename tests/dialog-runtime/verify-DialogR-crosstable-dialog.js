"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { readDialogScriptSource } = require("../dialogScriptSource");
const { createDialogControlModelFromSources, getDialogControl } = require(require("../dialogforge").dialogForgeModule("shared/dialog-runtime/custom-js/dialogControlModel"));
const { applyDialogRExternalCallResultToControls } = require(require("../dialogforge").productModule("runtime/dialogRDialogRuntimeAdapter"));
const { createDialogRuntimeHarness } = require(require("../dialogforge").dialogForgeModule("shared/dialog-runtime/custom-js/dialogRuntimeHarness"));
const { createDialogScriptRunner, listDialogScriptControlReferences } = require(require("../dialogforge").dialogForgeModule("shared/dialog-runtime/custom-js/dialogScriptRunner"));
const { createDialogExternalCallHost } = require(require("../dialogforge").dialogForgeModule("shared/dialog-runtime/custom-js/externalCallHost"));
const { setFilterState, setSplitByState, setWeightByState } = require(require("../dialogforge").dialogForgeModule("shared/dialog-runtime/custom-js/dialogBindings"));
const rootDir = path.resolve(__dirname, "../..");
const { readDialogControls, setDialogControlChecked, setDialogControlSelected, setDialogControlValue } = require("../dialogControls");
const waitForDialogPromises = function () {
    return new Promise((resolve) => {
        setTimeout(resolve, 0);
    });
};
const verifyCrosstableCommand = async function () {
    const source = JSON.parse(fs.readFileSync(path.join(rootDir, "dialogs/r/crosstable/dialog.json"), "utf8"));
    const customJS = readDialogScriptSource(rootDir, "dialogs/r/crosstable/dialog.json", source);
    const commands = [];
    const model = createDialogControlModelFromSources(readDialogControls(source));
    const externalCallHost = createDialogExternalCallHost({
        datasets: [
            { name: "survey", columns: ["group", "answer", "weight"] }
        ]
    });
    setSplitByState(externalCallHost.state, {
        dataset: "survey",
        grouping: ["group"]
    });
    setWeightByState(externalCallHost.state, {
        dataset: "survey",
        weighting: "weight"
    });
    setFilterState(externalCallHost.state, {
        dataset: "survey",
        command: "subset(survey, answer != 9)"
    });
    const runner = createDialogScriptRunner({
        model,
        harness: createDialogRuntimeHarness({
            externalCallHost
        }),
        afterExternalCall: async function (name, parameters, value) {
            applyDialogRExternalCallResultToControls(model, name, value, parameters);
        },
        controlNames: listDialogScriptControlReferences(customJS),
        listObjects: function (kind) {
            return kind === "datasets" ? ["survey"] : [];
        },
        listColumns: function (objectName) {
            return objectName === "survey" ? ["group", "answer", "weight"] : [];
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
    await waitForDialogPromises();
    assert.deepStrictEqual(getDialogControl(model, "c_datasets").value, ["survey"]);
    setDialogControlSelected(model, "c_datasets", ["survey"]);
    assert.strictEqual((await runner.trigger("change", "c_datasets")).status, "ready");
    assert.deepStrictEqual(getDialogControl(model, "c_rows").value, ["group", "answer", "weight"]);
    assert.deepStrictEqual(getDialogControl(model, "c_cols").value, ["group", "answer", "weight"]);
    setDialogControlSelected(model, "c_rows", ["group"]);
    assert.strictEqual((await runner.trigger("change", "c_rows")).status, "ready");
    setDialogControlSelected(model, "c_cols", ["answer"]);
    assert.strictEqual((await runner.trigger("change", "c_cols")).status, "ready");
    assert.strictEqual(getDialogControl(model, "cb_proportions").checked, false);
    assert.strictEqual(getDialogControl(model, "select1").enabled, false);
    setDialogControlChecked(model, "cb_proportions", true);
    assert.strictEqual((await runner.trigger("change", "cb_proportions")).status, "ready");
    assert.strictEqual(getDialogControl(model, "select1").enabled, true);
    setDialogControlValue(model, "select1", "Columns");
    assert.strictEqual((await runner.trigger("change", "select1")).status, "ready");
    setDialogControlChecked(model, "cb_chisq", true);
    assert.strictEqual((await runner.trigger("change", "cb_chisq")).status, "ready");
    assert.strictEqual(getDialogControl(model, "__syntaxCommand").value, [
        "using(",
        "  survey,",
        "  {",
        "    .table <- wtable(group, answer, wt = weight)",
        "    print(.table)",
        "    proportions(.table, margin = 2)",
        "    chisq.test(.table)",
        "  },",
        "  split.by = group",
        ")"
    ].join("\n"));
    assert.strictEqual((await runner.trigger("click", "b_run")).status, "ready");
    assert.deepStrictEqual(commands, [
        String(getDialogControl(model, "__syntaxCommand").value || "")
    ]);
};
verifyCrosstableCommand()
    .then(() => {
    console.log("DialogR crosstable source dialog verified.");
})
    .catch((error) => {
    console.error(error);
    process.exit(1);
});
