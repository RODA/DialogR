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
const { getSplitByState } = require(require("../dialogforge").dialogForgeModule("shared/dialog-runtime/custom-js/dialogBindings"));
const rootDir = path.resolve(__dirname, "../..");
const { readDialogControls, setDialogControlChecked, setDialogControlSelected } = require("../dialogControls");
const verifySplitByState = async function () {
    const source = JSON.parse(fs.readFileSync(path.join(rootDir, "dialogs/r/splitby/dialog.json"), "utf8"));
    const customJS = readDialogScriptSource(rootDir, "dialogs/r/splitby/dialog.json", source);
    let closed = false;
    const model = createDialogControlModelFromSources(readDialogControls(source));
    const externalCallHost = createDialogExternalCallHost({
        datasets: [
            { name: "survey", columns: ["id", "group", "score"] }
        ]
    });
    const runner = createDialogScriptRunner({
        model,
        harness: createDialogRuntimeHarness({
            externalCallHost
        }),
        closeDialog: function () {
            closed = true;
        },
        controlNames: listDialogScriptControlReferences(customJS),
        listObjects: function (kind) {
            return kind === "datasets" ? ["survey"] : [];
        },
        enableSearch: function () {
            return undefined;
        },
        resetDialog: function () {
            return undefined;
        }
    });
    const setup = await runner.run(customJS);
    assert.strictEqual(setup.status, "ready");
    assert.deepStrictEqual(getDialogControl(model, "c_datasets").value, ["survey"]);
    setDialogControlSelected(model, "c_datasets", ["survey"]);
    assert.strictEqual((await runner.trigger("change", "c_datasets")).status, "ready");
    assert.deepStrictEqual(getDialogControl(model, "c_variables").value, ["id", "group", "score"]);
    setDialogControlSelected(model, "c_variables", ["group"]);
    assert.strictEqual((await runner.trigger("change", "c_variables")).status, "ready");
    assert.strictEqual((await runner.trigger("click", "addremove")).status, "ready");
    assert.deepStrictEqual(getDialogControl(model, "c_grouping").value, ["group"]);
    assert.deepStrictEqual(getDialogControl(model, "c_variables").value, ["id", "score"]);
    assert.deepStrictEqual(getSplitByState(externalCallHost.state, "survey"), {
        dataset: "survey",
        grouping: ["group"],
        sortdataset: false
    });
    setDialogControlChecked(model, "sortdataset", true);
    assert.strictEqual((await runner.trigger("change", "sortdataset")).status, "ready");
    assert.deepStrictEqual(getSplitByState(externalCallHost.state, "survey"), {
        dataset: "survey",
        grouping: ["group"],
        sortdataset: true
    });
    assert.strictEqual((await runner.trigger("click", "b_reset")).status, "ready");
    assert.strictEqual(closed, false);
    assert.strictEqual(getSplitByState(externalCallHost.state, "survey"), null);
    assert.strictEqual((await runner.trigger("click", "b_run")).status, "ready");
    assert.strictEqual(closed, true);
};
verifySplitByState()
    .then(() => {
    console.log("DialogR split-by source dialog verified.");
})
    .catch((error) => {
    console.error(error);
    process.exit(1);
});
