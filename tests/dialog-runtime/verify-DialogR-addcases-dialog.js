"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { dialogForgeModule } = require("../dialogforge");
const { createDialogControlModelFromSources } = require(dialogForgeModule(
    "shared/dialog-runtime/custom-js/dialogControlModel"
));
const { createDialogScriptRunner } = require(dialogForgeModule(
    "shared/dialog-runtime/custom-js/dialogScriptRunner"
));
const {
    readDialogControls,
    setDialogControlSelected,
    setDialogControlChecked,
    setDialogControlValue
} = require("../dialogControls");

const verify = async function() {
    const directory = path.resolve(__dirname, "../../dialogs/r/addcases");
    const source = JSON.parse(fs.readFileSync(path.join(directory, "dialog.json"), "utf8"));
    const model = createDialogControlModelFromSources(readDialogControls(source));
    const columns = {
        survey1: ["id", "weight", "group"],
        survey2: ["dose", "id", "len", "supp"],
        balanced: ["id", "len", "supp"],
        unrelated: ["height"],
        wide1: ["id", "a", "b", "c"],
        wide2: ["id", "d", "e", "f"]
    };
    const commands = [];
    const runner = createDialogScriptRunner({
        model,
        harness: { callExternal: async () => null },
        listObjects: () => Object.keys(columns),
        listColumns: name => columns[name].map(name => ({ name })),
        runCommand: async command => {
            commands.push(command);
            return { ok: true };
        }
    });
    const ready = async function(promise) {
        const result = await promise;
        assert.equal(result.status, "ready", result.error);
    };
    const event = (type, name) => ready(runner.trigger(type, name));
    const select = async function(control, value) {
        setDialogControlSelected(model, control, [value]);
        await event("change", control);
    };
    const include = async function(value) {
        await select("c_unpaired", value);
        await event("click", "button1");
    };
    const command = async function() {
        await event("click", "b_run");
        return commands.pop().replace(/\s+/g, " ");
    };

    await ready(runner.run(fs.readFileSync(path.join(directory, "actions.js"), "utf8")));
    assert.equal(model.controls.newdataset.visible, false);
    await event("click", "b_run");
    assert.equal(commands.length, 0);
    await select("dataset1", "survey1");
    await select("dataset2", "survey2");
    // Overwriting keeps every original x column fixed in Common.
    assert.deepEqual(model.controls.c_common.value, ["id", "(1) weight", "(1) group"]);
    assert.deepEqual(model.controls.c_unpaired.value, ["(2) dose", "(2) len", "(2) supp"]);
    assert.equal(await command(), 'survey1 <- addCases( survey1, survey2, keep = "x" )');
    await select("c_common", "(1) weight");
    assert.equal(model.controls.button1.enabled, false);
    await event("click", "button1");
    assert.deepEqual(model.controls.c_common.value, ["id", "(1) weight", "(1) group"]);
    await include("(2) len");
    assert.ok(model.controls.c_common.value.includes("(2) len"));
    assert.equal(await command(), 'survey1 <- addCases( survey1, survey2, keep = "x", add.y = "len" )');
    await select("c_common", "(2) len");
    assert.equal(model.controls.button1.value, "←");
    await event("click", "button1");
    assert.ok(model.controls.c_unpaired.value.includes("(2) len"));

    // Switching mode keeps selections, but releases the x-only columns.
    setDialogControlChecked(model, "checkbox1", true);
    await event("change", "checkbox1");
    setDialogControlValue(model, "newdataset", "combined");
    await event("input", "newdataset");
    await select("c_common", "(1) weight");
    assert.equal(model.controls.button1.enabled, true);
    await event("click", "button1");
    setDialogControlChecked(model, "checkbox1", false);
    await event("change", "checkbox1");
    assert.deepEqual(model.controls.c_common.value, ["id", "(1) weight", "(1) group"]);
    assert.equal(model.controls.newdataset.visible, false);
    await select("c_common", "(1) weight");
    assert.equal(model.controls.button1.enabled, false);

    // Start a fresh pair in new-dataset mode for optional selection checks.
    setDialogControlChecked(model, "checkbox1", true);
    await event("change", "checkbox1");
    await select("dataset2", "survey1");
    await select("dataset2", "survey2");
    assert.equal(await command(), "combined <- addCases( survey1, survey2 )");

    // Shared variables stay in Common; only promoted variables can go back.
    await select("c_common", "id");
    assert.equal(model.controls.button1.enabled, false);
    await include("(1) weight");
    assert.ok(model.controls.c_common.value.includes("(1) weight"));
    assert.equal(await command(), 'combined <- addCases( survey1, survey2, add.x = "weight" )');
    assert.deepEqual(model.controls.c_common.selected, []);
    await select("c_common", "(1) weight");
    assert.equal(model.controls.button1.value, "←");
    assert.equal(model.controls.button1.enabled, true);
    assert.deepEqual(model.controls.c_unpaired.selected, []);
    await event("click", "button1");
    assert.deepEqual(model.controls.c_common.value, ["id"]);
    assert.equal(model.controls.c_unpaired.value[0], "(1) weight");
    assert.equal(model.controls.button1.value, "→");
    assert.equal(model.controls.button1.enabled, false);
    assert.equal(await command(), "combined <- addCases( survey1, survey2 )");

    // Switching sides updates the direction and clears the previous selection.
    await include("(2) len");
    assert.ok(model.controls.c_common.value.includes("(2) len"));
    assert.equal(await command(), 'combined <- addCases( survey1, survey2, add.y = "len" )');
    await include("(1) weight");
    assert.ok(model.controls.c_common.value.includes("(1) weight"));
    assert.equal(await command(), 'combined <- addCases( survey1, survey2, add.x = "weight", add.y = "len" )');
    await select("c_common", "(1) weight");
    await event("click", "button1");
    await select("c_common", "(2) len");
    assert.equal(model.controls.button1.value, "←");
    await select("c_unpaired", "(1) weight");
    assert.equal(model.controls.button1.value, "→");
    assert.deepEqual(model.controls.c_common.selected, []);
    await select("c_common", "(2) len");
    await event("click", "button1");
    assert.deepEqual(model.controls.c_common.value, ["id"]);
    assert.ok(model.controls.c_unpaired.value.includes("(2) len"));
    assert.equal(await command(), "combined <- addCases( survey1, survey2 )");

    await include("(1) weight");
    await include("(1) group");
    assert.equal(await command(), 'combined <- addCases( survey1, survey2, keep = "x" )');
    await include("(2) len");
    await include("(2) supp");
    await include("(2) dose");
    assert.equal(await command(), 'combined <- addCases( survey1, survey2, keep = "all" )');

    // Changing the pair resets the selected unpaired variables.
    await select("dataset2", "survey1");
    await event("click", "b_run");
    assert.equal(commands.length, 0);
    await select("dataset2", "survey2");
    await include("(2) len");
    await include("(2) supp");
    await include("(2) dose");
    assert.equal(await command(), 'combined <- addCases( survey1, survey2, keep = "y" )');

    await select("dataset2", "survey1");
    await select("dataset2", "survey2");
    await include("(1) weight");
    await include("(2) len");
    await include("(2) supp");
    assert.equal(await command(), 'combined <- addCases( survey1, survey2, keep = "all", exclude = "group, dose" )');

    setDialogControlValue(model, "newdataset", "");
    await event("input", "newdataset");
    assert.equal(model.controls.newdataset.visible, true);
    await event("click", "b_run");
    assert.equal(commands.length, 0);
    setDialogControlValue(model, "newdataset", "survey2");
    await event("input", "newdataset");
    await event("click", "b_run");
    assert.equal(commands.length, 0);
    setDialogControlValue(model, "newdataset", "combined");
    await event("input", "newdataset");
    assert.equal(await command(), 'combined <- addCases( survey1, survey2, keep = "all", exclude = "group, dose" )');

    // A tie uses additions; keeping more than half uses the shorter exclusion.
    await select("dataset2", "balanced");
    await include("(1) weight");
    await include("(2) len");
    assert.ok(model.controls.c_common.value.includes("(2) len"));
    assert.equal(await command(), 'combined <- addCases( survey1, balanced, add.x = "weight", add.y = "len" )');
    await include("(2) supp");
    assert.equal(await command(), 'combined <- addCases( survey1, balanced, keep = "y", add.x = "weight" )');

    // Whole-side shortcuts plus sparse additions avoid spelling out that side.
    await select("dataset1", "wide1");
    await select("dataset2", "wide2");
    for (const name of ["a", "b", "c"]) await include("(1) " + name);
    await include("(2) d");
    assert.equal(await command(), 'combined <- addCases( wide1, wide2, keep = "x", add.y = "d" )');
    await select("dataset2", "wide1");
    await select("dataset2", "wide2");
    for (const name of ["d", "e", "f"]) await include("(2) " + name);
    await include("(1) a");
    assert.equal(await command(), 'combined <- addCases( wide1, wide2, keep = "y", add.x = "a" )');
    await select("dataset1", "survey1");

    // With no shared variables, require the user to include variables first.
    await select("dataset2", "unrelated");
    await event("click", "b_run");
    assert.equal(commands.length, 0);
    await include("(2) height");
    assert.equal(await command(), 'combined <- addCases( survey1, unrelated, keep = "y" )');
    await select("c_common", "(2) height");
    assert.equal(model.controls.button1.value, "←");
    await event("click", "button1");
    assert.deepEqual(model.controls.c_common.value, []);
    assert.ok(model.controls.c_unpaired.value.includes("(2) height"));
    await event("click", "b_run");
    assert.equal(commands.length, 0);
    // Disjoint datasets still append successfully in overwrite mode.
    setDialogControlChecked(model, "checkbox1", false);
    await event("change", "checkbox1");
    assert.deepEqual(model.controls.c_common.value, ["(1) id", "(1) weight", "(1) group"]);
    assert.equal(await command(), 'survey1 <- addCases( survey1, unrelated, keep = "x" )');
};

verify().then(() => {
    console.log("DialogR add-cases source dialog verified.");
}).catch(error => {
    console.error(error);
    process.exit(1);
});
