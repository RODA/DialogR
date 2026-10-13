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
const { setFilterState } = require(require("../dialogforge").dialogForgeModule("shared/dialog-runtime/custom-js/dialogBindings"));
const rootDir = path.resolve(__dirname, "../..");
const { readDialogControls, setDialogControlChecked, setDialogControlSelected, setDialogControlValue } = require("../dialogControls");
const waitForDialogPromises = function () {
    return new Promise((resolve) => {
        setTimeout(resolve, 0);
    });
};
const applyControlUpdates = function (model, value) {
    applyDialogRExternalCallResultToControls(model, "DialogR.test", value);
};
const createHost = function () {
    const externalCallHost = createDialogExternalCallHost({
        datasets: [
            { name: "survey", columns: ["group", "score"] }
        ]
    });
    setFilterState(externalCallHost.state, {
        dataset: "survey",
        command: "subset(survey, score > 0)"
    });
    return externalCallHost;
};
const verifyOneSampleTTest = async function () {
    const source = JSON.parse(fs.readFileSync(path.join(rootDir, "dialogs/r/onesamplettest/dialog.json"), "utf8"));
    const customJS = readDialogScriptSource(rootDir, "dialogs/r/onesamplettest/dialog.json", source);
    const commands = [];
    const model = createDialogControlModelFromSources(readDialogControls(source));
    const runner = createDialogScriptRunner({
        model,
        harness: createDialogRuntimeHarness({
            externalCallHost: createHost()
        }),
        afterExternalCall: async function (name, parameters, value) {
            applyControlUpdates(model, value);
        },
        controlNames: listDialogScriptControlReferences(customJS),
        listObjects: function (kind) {
            return kind === "datasets" ? ["survey"] : [];
        },
        listColumns: function (objectName) {
            return objectName === "survey" ? ["group", "score"] : [];
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
    assert.strictEqual((await runner.run(customJS)).status, "ready");
    await waitForDialogPromises();
    assert.deepStrictEqual(getDialogControl(model, "c_datasets").value, ["survey"]);
    setDialogControlSelected(model, "c_datasets", ["survey"]);
    assert.strictEqual((await runner.trigger("change", "c_datasets")).status, "ready");
    assert.deepStrictEqual(getDialogControl(model, "c_variables").value, ["group", "score"]);
    setDialogControlSelected(model, "c_variables", ["score"]);
    assert.strictEqual((await runner.trigger("change", "c_variables")).status, "ready");
    setDialogControlValue(model, "mu", "10");
    assert.strictEqual((await runner.trigger("change", "mu")).status, "ready");
    setDialogControlValue(model, "cl", "99");
    assert.strictEqual((await runner.trigger("change", "cl")).status, "ready");
    setDialogControlChecked(model, "r_neq", false);
    setDialogControlChecked(model, "r_gt", true);
    assert.strictEqual((await runner.trigger("change", "radiogroup1")).status, "ready");
    assert.strictEqual(getDialogControl(model, "__syntaxCommand").value, [
        "using(",
        "  survey,",
        "  t.test(score, alternative = \"greater\", mu = 10, conf.level = 0.99)",
        ")"
    ].join("\n"));
    assert.strictEqual((await runner.trigger("click", "b_run")).status, "ready");
    assert.deepStrictEqual(commands, [
        String(getDialogControl(model, "__syntaxCommand").value || "")
    ]);
};
const verifyIndependentSamplesTTest = async function () {
    const source = JSON.parse(fs.readFileSync(path.join(rootDir, "dialogs/r/independentsamplesttest/dialog.json"), "utf8"));
    const customJS = readDialogScriptSource(rootDir, "dialogs/r/independentsamplesttest/dialog.json", source);
    const commands = [];
    const model = createDialogControlModelFromSources(readDialogControls(source));
    const runner = createDialogScriptRunner({
        model,
        harness: createDialogRuntimeHarness({
            externalCallHost: createHost()
        }),
        afterExternalCall: async function (name, parameters, value) {
            applyControlUpdates(model, value);
        },
        controlNames: listDialogScriptControlReferences(customJS),
        listObjects: function (kind) {
            return kind === "datasets" ? ["survey"] : [];
        },
        listColumns: function (objectName) {
            return objectName === "survey" ? ["group", "score"] : [];
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
    assert.strictEqual((await runner.run(customJS)).status, "ready");
    await waitForDialogPromises();
    assert.deepStrictEqual(getDialogControl(model, "c_datasets").value, ["survey"]);
    setDialogControlSelected(model, "c_datasets", ["survey"]);
    assert.strictEqual((await runner.trigger("change", "c_datasets")).status, "ready");
    assert.deepStrictEqual(getDialogControl(model, "c_testvar").value, ["group", "score"]);
    assert.deepStrictEqual(getDialogControl(model, "c_groupvar").value, ["group", "score"]);
    setDialogControlSelected(model, "c_testvar", ["score"]);
    assert.strictEqual((await runner.trigger("change", "c_testvar")).status, "ready");
    setDialogControlSelected(model, "c_groupvar", ["group"]);
    assert.strictEqual((await runner.trigger("change", "c_groupvar")).status, "ready");
    assert.strictEqual(getDialogControl(model, "hvtest").checked, true);
    assert.strictEqual(getDialogControl(model, "r_yes").enabled, false);
    assert.strictEqual(getDialogControl(model, "r_no").checked, true);
    setDialogControlValue(model, "input1", "90");
    assert.strictEqual((await runner.trigger("change", "input1")).status, "ready");
    setDialogControlChecked(model, "r_twosided", false);
    setDialogControlChecked(model, "r_right", true);
    assert.strictEqual((await runner.trigger("change", "alternative")).status, "ready");
    setDialogControlChecked(model, "hvtest", false);
    assert.strictEqual((await runner.trigger("change", "hvtest")).status, "ready");
    assert.strictEqual(getDialogControl(model, "r_yes").enabled, true);
    setDialogControlChecked(model, "r_no", false);
    setDialogControlChecked(model, "r_yes", true);
    assert.strictEqual((await runner.trigger("change", "varequal")).status, "ready");
    assert.strictEqual(getDialogControl(model, "__syntaxCommand").value, [
        "using(",
        "  survey,",
        "  t.testhv(score ~ group, alternative = \"greater\", var.equal = TRUE, conf.level = 0.9)",
        ")"
    ].join("\n"));
    assert.strictEqual((await runner.trigger("click", "b_run")).status, "ready");
    assert.deepStrictEqual(commands, [
        String(getDialogControl(model, "__syntaxCommand").value || "")
    ]);
};
Promise.all([
    verifyOneSampleTTest(),
    verifyIndependentSamplesTTest()
])
    .then(() => {
    console.log("DialogR t-test source dialogs verified.");
})
    .catch((error) => {
    console.error(error);
    process.exit(1);
});
