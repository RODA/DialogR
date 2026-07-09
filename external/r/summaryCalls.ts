import type {
    ProfileCustomJSApi
} from "dialogforge/shared/dialog-runtime/renderer/modules/profileCustomJSApi";
import {
    normalizeDatasetState,
    normalizeFilterDatasetState,
    normalizeWeightByDatasetState
} from "./datasetState";
import {
    asPayloadRecord,
    DialogRRuntimeApi
} from "./runtimeApi";
import {
    buildSummaryCommandText,
    clearSummaryStatisticErrors,
    getSummaryControls,
    getSummarySelection,
    isRuntimeChecked,
    summaryMeasureOrder
} from "./summaryRuntime";


interface SummaryCallOptions {
    api: ProfileCustomJSApi;
    runtimeApi: DialogRRuntimeApi;
    invoke: (channel: string, payload?: unknown) => Promise<unknown>;
}


export const registerSummaryCalls = function(options: SummaryCallOptions): void {
    const register = options.api.registerExternalCall;

    if (!register) {
        return;
    }

    register("syncSummaryStatisticSelection", async (parameters) => {
        const payload = asPayloadRecord(parameters);
        const controls = getSummaryControls(payload);
        const active = String(payload.active || "").trim();

        if (
            !active
            || !isRuntimeChecked(options.runtimeApi, active)
            || !options.runtimeApi.uncheck
        ) {
            return null;
        }

        const exclusive = [controls.summary, controls.quantile].filter(Boolean);
        const measures = summaryMeasureOrder
            .map((name) => controls[name])
            .filter(Boolean);
        const targets = exclusive.includes(active)
            ? [...exclusive, ...measures].filter((item) => item !== active)
            : exclusive;

        targets.forEach((elementName) => {
            if (isRuntimeChecked(options.runtimeApi, elementName)) {
                options.runtimeApi.uncheck?.(elementName);
            }
        });

        return null;
    });

    register("hasSummaryStatisticSelection", async (parameters) => {
        const selection = getSummarySelection(options.runtimeApi, parameters);

        return selection.summary
            || selection.quantile
            || selection.measures.length > 0;
    });

    register("buildSummaryCommand", async (parameters) => {
        return buildSummaryCommandText(parameters);
    });

    register("refreshSummarySyntax", async (parameters) => {
        const selection = getSummarySelection(options.runtimeApi, parameters);

        clearSummaryStatisticErrors(options.runtimeApi, selection.controls);

        let datasetExpression = selection.dataset;
        let split: string[] = [];
        let weight = "";

        if (selection.dataset !== "<dataset>") {
            const [splitValue, weightValue, filterValue] = await Promise.all([
                options.invoke("splitBy:getState", {
                    dataset: selection.dataset
                }),
                options.invoke("weightBy:getState", {
                    dataset: selection.dataset
                }),
                options.invoke("filter:getState", {
                    dataset: selection.dataset
                })
            ]);

            split = normalizeDatasetState(splitValue).grouping;
            weight = normalizeWeightByDatasetState(weightValue).weighting;
            datasetExpression = normalizeFilterDatasetState(filterValue).command
                || selection.dataset;
        }

        const command = buildSummaryCommandText({
            dataset: selection.dataset,
            variables: selection.variables,
            summary: selection.summary,
            quantile: selection.quantile,
            measures: selection.measures,
            datasetExpression,
            split,
            weight
        });

        options.runtimeApi.updateSyntax?.(command);

        return command;
    });
};
