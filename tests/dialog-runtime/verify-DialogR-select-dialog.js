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
const verifySelectDialog = async function () {
    const source = JSON.parse(fs.readFileSync(path.join(rootDir, "dialogs/r/select/dialog.json"), "utf8"));
    const customJS = readDialogScriptSource(rootDir, "dialogs/r/select/dialog.json", source);
    const commands = [];
    const model = createDialogControlModelFromSources(readDialogControls(source));
    const runner = createDialogScriptRunner({
        model,
        harness: createDialogRuntimeHarness({
            externalCallHost: createDialogExternalCallHost({
                datasets: [
                    { name: "survey", columns: ["age", "income", "group"] }
                ]
            })
        }),
        controlNames: listDialogScriptControlReferences(customJS),
        listObjects: function (kind) {
            return kind === "datasets" ? ["survey"] : [];
        },
        listColumns: function (objectName) {
            return objectName === "survey" ? ["age", "income", "group"] : [];
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
    setDialogControlSelected(model, "c_datasets", ["survey"]);
    assert.strictEqual((await runner.trigger("change", "c_datasets")).status, "ready");
    assert.deepStrictEqual(getDialogControl(model, "c_variables").value, ["age", "income", "group"]);
    assert.strictEqual(getDialogControl(model, "cb_allvars").checked, true);
    assert.strictEqual(getDialogControl(model, "c_variables").enabled, false);
    setDialogControlChecked(model, "cb_allvars", false);
    assert.strictEqual((await runner.trigger("change", "cb_allvars")).status, "ready");
    assert.strictEqual(getDialogControl(model, "c_variables").enabled, true);
    setDialogControlSelected(model, "c_variables", ["age", "income"]);
    assert.strictEqual((await runner.trigger("change", "c_variables")).status, "ready");
    setDialogControlChecked(model, "rd_all", false);
    setDialogControlChecked(model, "rd_new", true);
    assert.strictEqual((await runner.trigger("change", "radiogroup1")).status, "ready");
    assert.strictEqual(getDialogControl(model, "newname").visible, true);
    assert.strictEqual(getDialogControl(model, "expression").enabled, true);
    setDialogControlValue(model, "newname", "survey_subset");
    assert.strictEqual((await runner.trigger("change", "newname")).status, "ready");
    setDialogControlValue(model, "expression", "group == 1");
    assert.strictEqual((await runner.trigger("change", "expression")).status, "ready");
    const syntax = String(getDialogControl(model, "__syntaxCommand").value || "");
    assert.ok(syntax.includes("survey_subset <- subset("));
    assert.ok(syntax.includes("group == 1"));
    assert.ok(syntax.includes("select = c(age, income)"));
    assert.strictEqual((await runner.trigger("click", "b_run")).status, "ready");
    assert.strictEqual(commands.length, 1);
    assert.ok(commands[0].includes("survey_subset <- subset("));
};
verifySelectDialog()
    .then(() => {
    console.log("DialogR select source dialog verified.");
})
    .catch((error) => {
    console.error(error);
    process.exit(1);
});
