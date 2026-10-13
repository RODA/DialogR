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
const rootDir = path.resolve(__dirname, "../..");
const waitForDialogPromises = function () {
    return new Promise((resolve) => {
        setTimeout(resolve, 0);
    });
};
const { readDialogControls, setDialogControlSelected, setDialogControlValue } = require("../dialogControls");
const verifyRecodeRuleEditing = async function () {
    const source = JSON.parse(fs.readFileSync(path.join(rootDir, "dialogs/r/recode/dialog.json"), "utf8"));
    const customJS = readDialogScriptSource(rootDir, "dialogs/r/recode/dialog.json", source);
    const model = createDialogControlModelFromSources(readDialogControls(source));
    const runner = createDialogScriptRunner({
        model,
        harness: createDialogRuntimeHarness({
            externalCallHost: createDialogExternalCallHost({
                datasets: [
                    { name: "survey", columns: ["age", "income"] }
                ]
            })
        }),
        afterExternalCall: async function (name, parameters, value) {
            applyDialogRExternalCallResultToControls(
                model,
                name,
                value,
                parameters
            );
        },
        controlNames: listDialogScriptControlReferences(customJS),
        listObjects: function (kind) {
            return kind === "datasets" ? ["survey"] : [];
        },
        listColumns: function (objectName) {
            return objectName === "survey" ? ["age", "income"] : [];
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
    await waitForDialogPromises();
    setDialogControlSelected(model, "c_datasets", ["survey"]);
    assert.strictEqual((await runner.trigger("change", "c_datasets")).status, "ready");
    assert.deepStrictEqual(getDialogControl(model, "c_variables").value, ["age", "income"]);
    setDialogControlSelected(model, "c_variables", ["age"]);
    assert.strictEqual((await runner.trigger("change", "c_variables")).status, "ready");
    assert.strictEqual(getDialogControl(model, "checkbox1").checked, false);
    assert.strictEqual(getDialogControl(model, "i_newvar").visible, false);
    assert.strictEqual((await runner.trigger("click", "i_value_old")).status, "ready");
    assert.strictEqual(getDialogControl(model, "r_old1").checked, true);
    setDialogControlValue(model, "i_value_old", "1");
    assert.strictEqual((await runner.trigger("change", "i_value_old")).status, "ready");
    assert.strictEqual((await runner.trigger("click", "i_value_new")).status, "ready");
    assert.strictEqual(getDialogControl(model, "r_new1").checked, true);
    setDialogControlValue(model, "i_value_new", "0");
    assert.strictEqual((await runner.trigger("change", "i_value_new")).status, "ready");
    assert.strictEqual((await runner.trigger("click", "b_add")).status, "ready");
    assert.deepStrictEqual(getDialogControl(model, "c_rules").value, ["1=0"]);
    assert.ok(String(getDialogControl(model, "__syntaxCommand").value).includes("rules = \"1=0\""));
    setDialogControlSelected(model, "c_rules", ["1=0"]);
    assert.strictEqual((await runner.trigger("click", "b_remove")).status, "ready");
    assert.deepStrictEqual(getDialogControl(model, "c_rules").value, []);
};
verifyRecodeRuleEditing()
    .then(() => {
    console.log("DialogR recode source dialog verified.");
})
    .catch((error) => {
    console.error(error);
    process.exit(1);
});
