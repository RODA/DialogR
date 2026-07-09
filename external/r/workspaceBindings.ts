import type {
    ProfileCustomJSContext
} from "dialogforge/shared/dialog-runtime/renderer/modules/profileCustomJSApi";
import {
    getSummaryControls,
    selectedFromRuntime
} from "./summaryRuntime";
import type {
    DialogRRuntimeApi
} from "./runtimeApi";


export const createWorkspaceBindings = function(options: {
    runtimeApi: DialogRRuntimeApi;
    context: ProfileCustomJSContext;
    getDatasetVariables: (datasetName: unknown) => Promise<unknown[]>;
}) {
    let summaryBound = false;
    let frequenciesBound = false;
    let crosstabsBound = false;
    const objectBindings = new Set<string>();

    const hasRequiredRuntimeMethods = function(): boolean {
        return typeof options.runtimeApi.setValue === "function"
            && typeof options.runtimeApi.listObjects === "function"
            && typeof options.runtimeApi.getSelected === "function"
            && typeof options.runtimeApi.triggerChange === "function";
    };

    const bindStateChangeEvents = function(callback: () => void): void {
        if (!options.context?.coms || typeof options.context.coms.on !== "function") {
            return;
        }

        options.context.coms.on("splitByStateChanged", callback);
        options.context.coms.on("weightByStateChanged", callback);
        options.context.coms.on("filterStateChanged", callback);
    };

    const bindSummary = async function(payload: unknown) {
        const controls = getSummaryControls(payload);

        if (!controls.datasets || !controls.variables || !hasRequiredRuntimeMethods()) {
            return null;
        }

        const refreshDatasetItems = async function(): Promise<void> {
            options.runtimeApi.setValue(
                controls.datasets,
                options.runtimeApi.listObjects("datasets")
            );

            const selectedDataset = selectedFromRuntime(
                options.runtimeApi,
                controls.datasets
            )[0] || "";

            if (!selectedDataset) {
                if (typeof options.runtimeApi.clearContent === "function") {
                    options.runtimeApi.clearContent(controls.variables);
                }

                options.runtimeApi.triggerChange(controls.variables);
                return;
            }

            const variables = await options.getDatasetVariables(selectedDataset);

            options.runtimeApi.setValue(controls.variables, variables);
            options.runtimeApi.triggerChange(controls.variables);
        };

        const refreshCurrentSyntax = function(): void {
            const selectedDataset = selectedFromRuntime(
                options.runtimeApi,
                controls.datasets
            )[0] || "";

            if (selectedDataset) {
                options.runtimeApi.triggerChange(controls.variables);
            }
        };

        if (
            !summaryBound
            && options.context?.objects?.events
            && typeof options.context.objects.events.on === "function"
        ) {
            summaryBound = true;
            options.context.objects.events.on("workspaceDataUpdated", () => {
                void refreshDatasetItems();
            });
            bindStateChangeEvents(refreshCurrentSyntax);
        }

        return null;
    };

    const bindFrequencies = async function(payload: unknown) {
        const source = payload && typeof payload === "object" && !Array.isArray(payload)
            ? payload as Record<string, unknown>
            : {};
        const datasetElement = String(source.datasets || "").trim();
        const variableElement = String(source.variables || "").trim();

        if (!datasetElement || !variableElement || !hasRequiredRuntimeMethods()) {
            return null;
        }

        const refresh = async function(): Promise<void> {
            options.runtimeApi.setValue(
                datasetElement,
                options.runtimeApi.listObjects("datasets")
            );

            const selectedDataset = selectedFromRuntime(
                options.runtimeApi,
                datasetElement
            )[0] || "";

            if (!selectedDataset) {
                if (typeof options.runtimeApi.clearContent === "function") {
                    options.runtimeApi.clearContent(variableElement);
                }

                options.runtimeApi.triggerChange(variableElement);
                return;
            }

            options.runtimeApi.setValue(
                variableElement,
                await options.getDatasetVariables(selectedDataset)
            );
            options.runtimeApi.triggerChange(variableElement);
        };

        const refreshCurrentSelection = function(): void {
            const selectedDataset = selectedFromRuntime(
                options.runtimeApi,
                datasetElement
            )[0] || "";

            options.runtimeApi.triggerChange(
                selectedDataset ? datasetElement : variableElement
            );
        };

        if (
            !frequenciesBound
            && options.context?.objects?.events
            && typeof options.context.objects.events.on === "function"
        ) {
            frequenciesBound = true;
            options.context.objects.events.on("workspaceDataUpdated", () => {
                void refresh();
            });
            bindStateChangeEvents(refreshCurrentSelection);
        }

        await refresh();

        return null;
    };

    const bindCrosstabs = async function(payload: unknown) {
        const source = payload && typeof payload === "object" && !Array.isArray(payload)
            ? payload as Record<string, unknown>
            : {};
        const datasetElement = String(source.datasets || "").trim();
        const rowsElement = String(source.rows || "").trim();
        const columnsElement = String(source.cols || "").trim();

        if (
            !datasetElement
            || !rowsElement
            || !columnsElement
            || !hasRequiredRuntimeMethods()
        ) {
            return null;
        }

        const refresh = async function(): Promise<void> {
            options.runtimeApi.setValue(
                datasetElement,
                options.runtimeApi.listObjects("datasets")
            );

            const selectedDataset = selectedFromRuntime(
                options.runtimeApi,
                datasetElement
            )[0] || "";

            if (!selectedDataset) {
                if (typeof options.runtimeApi.clearContent === "function") {
                    options.runtimeApi.clearContent(rowsElement);
                    options.runtimeApi.clearContent(columnsElement);
                }

                options.runtimeApi.triggerChange(rowsElement);
                options.runtimeApi.triggerChange(columnsElement);
                return;
            }

            const variables = await options.getDatasetVariables(selectedDataset);

            options.runtimeApi.setValue(rowsElement, variables);
            options.runtimeApi.setValue(columnsElement, variables);
            options.runtimeApi.triggerChange(rowsElement);
            options.runtimeApi.triggerChange(columnsElement);
        };

        const refreshCurrentSelection = function(): void {
            const selectedDataset = selectedFromRuntime(
                options.runtimeApi,
                datasetElement
            )[0] || "";

            if (selectedDataset) {
                options.runtimeApi.triggerChange(datasetElement);
                return;
            }

            options.runtimeApi.triggerChange(rowsElement);
            options.runtimeApi.triggerChange(columnsElement);
        };

        if (
            !crosstabsBound
            && options.context?.objects?.events
            && typeof options.context.objects.events.on === "function"
        ) {
            crosstabsBound = true;
            options.context.objects.events.on("workspaceDataUpdated", () => {
                void refresh();
            });
            bindStateChangeEvents(refreshCurrentSelection);
        }

        await refresh();

        return null;
    };

    const readObjectBindingVariableControls = function(value: unknown): string[] {
        if (typeof value === "string") {
            return [value].map((name) => String(name || "").trim()).filter(Boolean);
        }

        if (Array.isArray(value)) {
            return value.map((name) => String(name || "").trim()).filter(Boolean);
        }

        if (!value || typeof value !== "object") {
            return [];
        }

        return Object.values(value as Record<string, unknown>).flatMap((entry) => {
            if (Array.isArray(entry)) {
                return entry.map((name) => String(name || "").trim()).filter(Boolean);
            }

            return [String(entry || "").trim()].filter(Boolean);
        });
    };

    const bindObjects = async function(payload: unknown) {
        const source = payload && typeof payload === "object" && !Array.isArray(payload)
            ? payload as Record<string, unknown>
            : {};
        const datasetElement = String(source.datasets || "").trim();
        const variableElements = readObjectBindingVariableControls(source.variables);
        const autoRefresh = source.autoRefresh !== false;
        const bindingKey = [
            datasetElement,
            autoRefresh ? "auto" : "manual",
            ...variableElements
        ].join("\u0000");

        if (!datasetElement || !hasRequiredRuntimeMethods()) {
            return null;
        }

        const refresh = async function(): Promise<void> {
            options.runtimeApi.setValue(
                datasetElement,
                options.runtimeApi.listObjects("datasets")
            );

            const selectedDataset = selectedFromRuntime(
                options.runtimeApi,
                datasetElement
            )[0] || "";

            if (!selectedDataset) {
                if (typeof options.runtimeApi.clearContent === "function") {
                    variableElements.forEach((element) => {
                        options.runtimeApi.clearContent?.(element);
                        options.runtimeApi.triggerChange(element);
                    });
                }

                return;
            }

            if (!variableElements.length) {
                return;
            }

            const variables = await options.getDatasetVariables(selectedDataset);

            variableElements.forEach((element) => {
                options.runtimeApi.setValue(element, variables);
                options.runtimeApi.triggerChange(element);
            });
        };

        if (
            autoRefresh
            && !objectBindings.has(bindingKey)
            && options.context?.objects?.events
            && typeof options.context.objects.events.on === "function"
        ) {
            objectBindings.add(bindingKey);
            if (
                variableElements.length
                && typeof options.runtimeApi.onChange === "function"
            ) {
                options.runtimeApi.onChange(datasetElement, () => {
                    void refresh();
                });
            }
            options.context.objects.events.on("workspaceDataUpdated", () => {
                void refresh();
            });
        }

        await refresh();

        return null;
    };

    return {
        bindCrosstabs,
        bindFrequencies,
        bindObjects,
        bindSummary
    };
};
