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
const { getWeightByState } = require(require("../dialogforge").dialogForgeModule("shared/dialog-runtime/custom-js/dialogBindings"));
const rootDir = path.resolve(__dirname, "../..");
const { readDialogControls, setDialogControlSelected } = require("../dialogControls");
const verifyWeightByState = async function () {
    const source = JSON.parse(fs.readFileSync(path.join(rootDir, "dialogs/r/weightby/dialog.json"), "utf8"));
    const customJS = readDialogScriptSource(rootDir, "dialogs/r/weightby/dialog.json", source);
    let closed = false;
    const model = createDialogControlModelFromSources(readDialogControls(source));
    const externalCallHost = createDialogExternalCallHost({
        datasets: [
            { name: "survey", columns: ["id", "group", "weight"] }
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
    assert.deepStrictEqual(getDialogControl(model, "c_variables").value, ["id", "group", "weight"]);
    setDialogControlSelected(model, "c_variables", ["weight"]);
    assert.strictEqual((await runner.trigger("change", "c_variables")).status, "ready");
    assert.strictEqual((await runner.trigger("click", "addremove")).status, "ready");
    assert.deepStrictEqual(getDialogControl(model, "c_weighting").value, ["weight"]);
    assert.deepStrictEqual(getDialogControl(model, "c_weighting").selected, ["weight"]);
    assert.deepStrictEqual(getDialogControl(model, "c_variables").value, ["id", "group"]);
    assert.deepStrictEqual(getWeightByState(externalCallHost.state, "survey"), {
        dataset: "survey",
        weighting: "weight"
    });
    assert.strictEqual((await runner.trigger("click", "b_reset")).status, "ready");
    assert.strictEqual(closed, false);
    assert.strictEqual(getWeightByState(externalCallHost.state, "survey"), null);
    assert.strictEqual((await runner.trigger("click", "b_run")).status, "ready");
    assert.strictEqual(closed, true);
};
verifyWeightByState()
    .then(() => {
    console.log("DialogR weight-by source dialog verified.");
})
    .catch((error) => {
    console.error(error);
    process.exit(1);
});
