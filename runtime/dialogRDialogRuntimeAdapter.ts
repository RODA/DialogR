import type { DialogControlModel } from "../runtime/dialogControlModel";
import {
    getDialogControl,
    setDialogControlChecked,
    setDialogControlSelected,
    setDialogControlValue
} from "../runtime/dialogControlModel";


interface DialogRExternalCallApplyResult {
    applied: boolean;
    refreshDatasetName: string;
}


interface DialogRSharedExternalCallValue {
    controlValues?: Record<string, unknown>;
    controlSelections?: Record<string, string[]>;
    refreshDatasetName?: string;
}


interface DialogRExternalCallParameters {
    __controlSnapshot?: Record<string, { selected?: unknown[] }>;
    controls?: Record<string, unknown>;
    datasets?: unknown;
}


const asObject = function(value: unknown): DialogRSharedExternalCallValue {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value as DialogRSharedExternalCallValue
        : {};
};


const applyControlValues = function(model: DialogControlModel, values: Record<string, unknown>): boolean {
    let applied = false;

    Object.keys(values).forEach((controlName) => {
        setDialogControlValue(model, controlName, values[controlName]);
        applied = true;
    });

    return applied;
};


const applyControlSelections = function(model: DialogControlModel, selections: Record<string, string[]>): boolean {
    let applied = false;

    Object.keys(selections).forEach((controlName) => {
        setDialogControlSelected(model, controlName, selections[controlName]);
        applied = true;
    });

    return applied;
};


const applySummarySyntax = function(model: DialogControlModel, name: string, value: unknown): boolean {
    if (name !== "refreshSummarySyntax" || typeof value !== "string") {
        return false;
    }

    setDialogControlValue(model, "__syntaxCommand", value);
    return true;
};


const applySummaryStatisticSelection = function(model: DialogControlModel, name: string, value: unknown): boolean {
    if (name !== "syncSummaryStatisticSelection" || !value || typeof value !== "object" || Array.isArray(value)) {
        return false;
    }

    const checked = (value as { checked?: Record<string, boolean> }).checked || {};
    let applied = false;

    Object.keys(checked).forEach((controlName) => {
        setDialogControlChecked(model, controlName, checked[controlName]);
        applied = true;
    });

    return applied;
};


const getParameterObject = function(value: unknown): DialogRExternalCallParameters {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value as DialogRExternalCallParameters
        : {};
};


const getControlSnapshotSelection = function(parameters: DialogRExternalCallParameters, controlName: string): string {
    const selected = parameters.__controlSnapshot?.[controlName]?.selected;

    return Array.isArray(selected) ? String(selected[0] || "").trim() : "";
};


const getCurrentSelection = function(model: DialogControlModel, controlName: string): string {
    const selected = getDialogControl(model, controlName).selected;

    return Array.isArray(selected) ? String(selected[0] || "").trim() : "";
};


const shouldSkipStaleSummaryWorkspaceUpdate = function(
    model: DialogControlModel,
    name: string,
    parameters: DialogRExternalCallParameters
): boolean {
    if (name !== "bindSummaryWorkspaceUpdates") {
        return false;
    }

    const controls = getParameterObject(parameters.controls || parameters);
    const datasetControlName = String(controls.datasets || parameters.datasets || "").trim();
    if (!datasetControlName) {
        return false;
    }

    const snapshotSelection = getControlSnapshotSelection(parameters, datasetControlName);
    const currentSelection = getCurrentSelection(model, datasetControlName);

    return snapshotSelection !== currentSelection;
};


export const applyDialogRExternalCallResultToControls = function(
    model: DialogControlModel,
    name: string,
    value: unknown,
    parameters: Record<string, unknown> = {}
): DialogRExternalCallApplyResult {
    const callParameters = getParameterObject(parameters);
    if (shouldSkipStaleSummaryWorkspaceUpdate(model, name, callParameters)) {
        return {
            applied: false,
            refreshDatasetName: ""
        };
    }

    const record = asObject(value);
    const appliedValues = applyControlValues(model, record.controlValues || {});
    const appliedSelections = applyControlSelections(model, record.controlSelections || {});
    const appliedSummarySyntax = applySummarySyntax(model, name, value);
    const appliedSummarySelection = applySummaryStatisticSelection(model, name, value);

    return {
        applied: appliedValues || appliedSelections || appliedSummarySyntax || appliedSummarySelection || Boolean(record.refreshDatasetName),
        refreshDatasetName: String(record.refreshDatasetName || "").trim()
    };
};


export const dialogRDialogRuntimeAdapterApi = {
    applyDialogRExternalCallResultToControls
};
