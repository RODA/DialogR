"use strict";

const assert = require("node:assert/strict");
const controlModel = require(require("./dialogforge").dialogForgeModule(
    "shared/dialog-runtime/custom-js/dialogControlModel"
));

const assertEditableControl = function(model, name) {
    const control = model.controls[name];
    assert.ok(control, `Unknown dialog control: ${name}`);
    assert.strictEqual(control.enabled, true, `${name} must be enabled before changing it`);
    assert.strictEqual(control.visible, true, `${name} must be visible before changing it`);
};

const setDialogControlValue = function(model, name, value) {
    assertEditableControl(model, name);
    controlModel.setDialogControlValue(model, name, value);
};

const setDialogControlChecked = function(model, name, checked) {
    assertEditableControl(model, name);
    controlModel.setDialogControlChecked(model, name, checked);
};

const setDialogControlSelected = function(model, name, selected) {
    assertEditableControl(model, name);
    const available = model.controls[name].value;
    assert.ok(Array.isArray(available), `${name} must have available choices`);
    for (const value of selected) {
        assert.ok(available.includes(value), `${name} does not offer ${value}`);
    }
    controlModel.setDialogControlSelected(model, name, selected);
};

const readDialogControls = function(source) {
    return (source.elements || []).map((element, index) => ({
        id: element.id,
        name: element.nameid || element.name || element.id || "control_" + index,
        type: element.type,
        value: element.value ?? "",
        checked: element.isChecked,
        isSelected: element.isSelected,
        isEnabled: element.isEnabled,
        isVisible: element.isVisible
    }));
};

module.exports = {
    readDialogControls,
    setDialogControlChecked,
    setDialogControlSelected,
    setDialogControlValue
};
