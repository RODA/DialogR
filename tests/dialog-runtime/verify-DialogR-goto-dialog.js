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
const { readDialogControls, setDialogControlValue } = require("../dialogControls");
const readGoToDialogSource = function () {
    return JSON.parse(fs.readFileSync(path.join(rootDir, "dialogs/r/goto/dialog.json"), "utf8"));
};
const createGoToRunner = function (mode) {
    const source = readGoToDialogSource();
    const customJS = readDialogScriptSource(rootDir, "dialogs/r/goto/dialog.json", source);
    const model = createDialogControlModelFromSources(readDialogControls(source));
    const caseCalls = [];
    const variableCalls = [];
    let closed = false;
    const runner = createDialogScriptRunner({
        model,
        harness: createDialogRuntimeHarness({
            externalCallHost: createDialogExternalCallHost({
                datasets: [
                    { name: "survey", columns: ["age", "income", "group"] }
                ]
            })
        }),
        closeDialog: function () {
            closed = true;
        },
        controlNames: listDialogScriptControlReferences(customJS),
        consumeGoToContext: async function () {
            return {
                mode,
                datasetName: "survey"
            };
        },
        getDatasetEditorState: async function () {
            return {
                datasetName: "survey"
            };
        },
        gotoDatasetEditorCase: async function (caseNumber) {
            caseCalls.push(caseNumber);
            return { ok: true };
        },
        gotoDatasetEditorVariable: async function (variableName) {
            variableCalls.push(variableName);
            return { ok: true };
        },
        listColumns: function (objectName) {
            return objectName === "survey" ? ["age", "income", "group"] : [];
        }
    });
    return {
        source,
        customJS,
        model,
        runner,
        caseCalls,
        variableCalls,
        isClosed: function () {
            return closed;
        }
    };
};
const flushDialogInitialization = async function () {
    await new Promise((resolve) => {
        setTimeout(resolve, 0);
    });
};
const verifyVariableMode = async function () {
    const fixture = createGoToRunner("variable");
    const result = await fixture.runner.run(fixture.customJS);
    assert.strictEqual(result.status, "ready", result.error);
    await flushDialogInitialization();
    assert.deepStrictEqual(getDialogControl(fixture.model, "vc_choice").selected, ["Variable"]);
    assert.deepStrictEqual(getDialogControl(fixture.model, "c_variables").value, ["age", "income", "group"]);
    assert.deepStrictEqual(getDialogControl(fixture.model, "c_variables").selected, ["age"]);
    assert.strictEqual(getDialogControl(fixture.model, "c_variables").enabled, true);
    assert.strictEqual(getDialogControl(fixture.model, "search").enabled, true);
    assert.strictEqual(getDialogControl(fixture.model, "caseno").enabled, false);
    setDialogControlValue(fixture.model, "search", "inc");
    assert.strictEqual((await fixture.runner.trigger("change", "search")).status, "ready");
    assert.deepStrictEqual(getDialogControl(fixture.model, "c_variables").value, ["income"]);
    assert.deepStrictEqual(getDialogControl(fixture.model, "c_variables").selected, ["income"]);
    assert.strictEqual((await fixture.runner.trigger("click", "button1")).status, "ready");
    assert.deepStrictEqual(fixture.variableCalls, ["income"]);
    assert.deepStrictEqual(fixture.caseCalls, []);
    assert.strictEqual(fixture.isClosed(), true);
};
const verifyCaseMode = async function () {
    const fixture = createGoToRunner("case");
    const result = await fixture.runner.run(fixture.customJS);
    assert.strictEqual(result.status, "ready", result.error);
    await flushDialogInitialization();
    assert.deepStrictEqual(getDialogControl(fixture.model, "vc_choice").selected, ["Case"]);
    assert.strictEqual(getDialogControl(fixture.model, "label1").enabled, true);
    assert.strictEqual(getDialogControl(fixture.model, "caseno").enabled, true);
    assert.strictEqual(getDialogControl(fixture.model, "search").enabled, false);
    assert.strictEqual(getDialogControl(fixture.model, "c_variables").enabled, false);
    assert.strictEqual(getDialogControl(fixture.model, "caseno").value, "1");
    setDialogControlValue(fixture.model, "caseno", "7");
    assert.strictEqual((await fixture.runner.trigger("click", "button1")).status, "ready");
    assert.deepStrictEqual(fixture.caseCalls, [7]);
    assert.deepStrictEqual(fixture.variableCalls, []);
    assert.strictEqual(fixture.isClosed(), true);
};
Promise.resolve()
    .then(verifyVariableMode)
    .then(verifyCaseMode)
    .then(() => {
    console.log("DialogR go-to source dialog verified.");
})
    .catch((error) => {
    console.error(error);
    process.exit(1);
});
