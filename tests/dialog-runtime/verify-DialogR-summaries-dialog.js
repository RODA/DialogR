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
const { setFilterState, setSplitByState, setWeightByState } = require(require("../dialogforge").dialogForgeModule("shared/dialog-runtime/custom-js/dialogBindings"));
const { applyDialogRExternalCallResultToControls } = require(require("../dialogforge").productModule("runtime/dialogRDialogRuntimeAdapter"));
const rootDir = path.resolve(__dirname, "../..");
const { readDialogControls, setDialogControlChecked, setDialogControlSelected } = require("../dialogControls");
const verifySummariesCommand = async function () {
    const source = JSON.parse(fs.readFileSync(path.join(rootDir, "dialogs/r/summaries/dialog.json"), "utf8"));
    const customJS = readDialogScriptSource(rootDir, "dialogs/r/summaries/dialog.json", source);
    const commands = [];
    const model = createDialogControlModelFromSources(readDialogControls(source));
    const externalCallHost = createDialogExternalCallHost({
        datasets: [
            { name: "survey", columns: ["group", "score", "weight"] }
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
        command: "subset(survey, score > 0)"
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
            return objectName === "survey" ? ["group", "score", "weight"] : [];
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
    assert.deepStrictEqual(getDialogControl(model, "c_variables").value, ["group", "score", "weight"]);
    setDialogControlSelected(model, "c_variables", ["score"]);
    assert.strictEqual((await runner.trigger("change", "c_variables")).status, "ready");
    assert.strictEqual(getDialogControl(model, "cb_mean").checked, false);
    setDialogControlChecked(model, "cb_mean", true);
    assert.strictEqual((await runner.trigger("change", "cb_mean")).status, "ready");
    assert.strictEqual(getDialogControl(model, "__syntaxCommand").value, [
        "using(",
        "  subset(survey, score > 0),",
        "  wmean(score, wt = weight),",
        "  split.by = group",
        ")",
        ""
    ].join("\n"));
    setDialogControlChecked(model, "cb_summary", true);
    assert.strictEqual((await runner.trigger("change", "cb_summary")).status, "ready");
    assert.strictEqual(getDialogControl(model, "cb_mean").checked, false);
    assert.strictEqual(getDialogControl(model, "__syntaxCommand").value, [
        "using(",
        "  subset(survey, score > 0),",
        "  wsummary(score, wt = weight),",
        "  split.by = group",
        ")",
        ""
    ].join("\n"));
    assert.strictEqual((await runner.trigger("click", "b_run")).status, "ready");
    assert.deepStrictEqual(commands, [
        String(getDialogControl(model, "__syntaxCommand").value || "")
    ]);
};
verifySummariesCommand()
    .then(() => {
    console.log("DialogR summaries source dialog verified.");
})
    .catch((error) => {
    console.error(error);
    process.exit(1);
});
