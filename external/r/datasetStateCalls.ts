import type {
    ProfileCustomJSApi
} from "dialogforge/shared/dialog-runtime/renderer/modules/profileCustomJSApi";
import {
    setButtonDirection
} from "./buttonDirection";
import {
    normalizeDatasetName,
    normalizeDatasetState,
    normalizeFilterDatasetState,
    normalizeGrouping,
    normalizeWeightByDatasetState
} from "./datasetState";
import {
    getVariableDisplayName
} from "./selectExpressionEditor";
import {
    asOptionalArray,
    asPayloadRecord
} from "./runtimeApi";


interface DatasetStateCallOptions {
    api: ProfileCustomJSApi;
    invoke: (channel: string, payload?: unknown) => Promise<unknown>;
    getDatasetVariables: (datasetName: unknown) => Promise<unknown[]>;
}


const getDatasets = function(payload: Record<string, unknown>): unknown[] | undefined {
    return asOptionalArray(payload.datasets);
};


export const registerDatasetStateCalls = function(
    options: DatasetStateCallOptions
): void {
    const register = options.api.registerExternalCall;

    if (!register) {
        return;
    }

    register("getSplitByState", async (parameters) => {
        const payload = asPayloadRecord(parameters);
        const dataset = normalizeDatasetName(payload.dataset);
        const result = await options.invoke(
            "splitBy:getState",
            dataset ? { dataset } : {}
        );

        if (!dataset) {
            return result;
        }

        const state = normalizeDatasetState(result);

        return {
            dataset,
            grouping: state.grouping.slice(),
            sortdataset: state.sortdataset
        };
    });

    register("setSplitByState", async (parameters) => {
        const payload = asPayloadRecord(parameters);
        const dataset = normalizeDatasetName(payload.dataset);

        if (!dataset) {
            return {
                dataset: "",
                grouping: [],
                sortdataset: false
            };
        }

        const result = await options.invoke("splitBy:setDatasetState", {
            dataset,
            grouping: normalizeGrouping(payload.grouping),
            sortdataset: payload.sortdataset === true,
            datasets: getDatasets(payload)
        });
        const state = normalizeDatasetState(result);

        return {
            dataset,
            grouping: state.grouping.slice(),
            sortdataset: state.sortdataset
        };
    });

    register("clearSplitByState", async (parameters) => {
        const payload = asPayloadRecord(parameters);
        const dataset = normalizeDatasetName(payload.dataset);

        if (!dataset) {
            return null;
        }

        return await options.invoke("splitBy:clearDatasetState", {
            dataset,
            datasets: getDatasets(payload)
        });
    });

    register("setSplitByButtonDirection", async (parameters) => {
        const payload = asPayloadRecord(parameters);
        const direction = payload.direction === "left" ? "left" : "right";

        return setButtonDirection(
            options.api,
            direction,
            "Remove selected grouping variable(s)",
            "Add selected grouping variable(s)"
        );
    });

    register("getWeightByState", async (parameters) => {
        const payload = asPayloadRecord(parameters);
        const dataset = normalizeDatasetName(payload.dataset);
        const result = await options.invoke(
            "weightBy:getState",
            dataset ? { dataset } : {}
        );

        if (!dataset) {
            return result;
        }

        return {
            dataset,
            weighting: normalizeWeightByDatasetState(result).weighting
        };
    });

    register("setWeightByState", async (parameters) => {
        const payload = asPayloadRecord(parameters);
        const dataset = normalizeDatasetName(payload.dataset);

        if (!dataset) {
            return {
                dataset: "",
                weighting: ""
            };
        }

        const result = await options.invoke("weightBy:setDatasetState", {
            dataset,
            weighting: String(payload.weighting ?? "").trim(),
            datasets: getDatasets(payload)
        });

        return {
            dataset,
            weighting: normalizeWeightByDatasetState(result).weighting
        };
    });

    register("clearWeightByState", async (parameters) => {
        const payload = asPayloadRecord(parameters);
        const dataset = normalizeDatasetName(payload.dataset);

        if (!dataset) {
            return null;
        }

        return await options.invoke("weightBy:clearDatasetState", {
            dataset,
            datasets: getDatasets(payload)
        });
    });

    register("setWeightByButtonDirection", async (parameters) => {
        const payload = asPayloadRecord(parameters);
        const direction = payload.direction === "left" ? "left" : "right";

        return setButtonDirection(
            options.api,
            direction,
            "Remove weighting variable",
            "Set weighting variable"
        );
    });

    register("getFilterState", async (parameters) => {
        const payload = asPayloadRecord(parameters);
        const dataset = normalizeDatasetName(payload.dataset);
        const result = await options.invoke(
            "filter:getState",
            dataset ? { dataset } : {}
        );

        if (!dataset) {
            return result;
        }

        return {
            dataset,
            command: normalizeFilterDatasetState(result).command
        };
    });

    register("setFilterState", async (parameters) => {
        const payload = asPayloadRecord(parameters);
        const dataset = normalizeDatasetName(payload.dataset);

        if (!dataset) {
            return {
                dataset: "",
                command: ""
            };
        }

        const result = await options.invoke("filter:setDatasetState", {
            dataset,
            command: normalizeFilterDatasetState({
                command: payload.command
            }).command,
            datasets: getDatasets(payload)
        });

        return {
            dataset,
            command: normalizeFilterDatasetState(result).command
        };
    });

    register("clearFilterState", async (parameters) => {
        const payload = asPayloadRecord(parameters);
        const dataset = normalizeDatasetName(payload.dataset);

        if (!dataset) {
            return null;
        }

        return await options.invoke("filter:clearDatasetState", {
            dataset,
            datasets: getDatasets(payload)
        });
    });

    register("inheritSubsetDatasetState", async (parameters) => {
        const payload = asPayloadRecord(parameters);
        const source = normalizeDatasetName(payload.source);
        const target = normalizeDatasetName(payload.target);

        if (!source || !target) {
            return null;
        }

        const datasets = normalizeGrouping([
            ...(asOptionalArray(payload.datasets) || []),
            target
        ]);
        const providedVariables = asOptionalArray(payload.variables) || [];
        const targetVariables = providedVariables.length
            ? providedVariables.map(getVariableDisplayName).filter(Boolean)
            : (await options.getDatasetVariables(target))
                .map(getVariableDisplayName)
                .filter(Boolean);
        const targetVariableSet = new Set(targetVariables);
        const splitState = normalizeDatasetState(
            await options.invoke("splitBy:getState", { dataset: source })
        );
        const grouping = splitState.grouping.filter((item) => {
            return targetVariableSet.size === 0 || targetVariableSet.has(item);
        });

        if (grouping.length || splitState.sortdataset) {
            await options.invoke("splitBy:setDatasetState", {
                dataset: target,
                grouping,
                sortdataset: splitState.sortdataset,
                datasets
            });
        } else {
            await options.invoke("splitBy:clearDatasetState", {
                dataset: target,
                datasets
            });
        }

        const weightState = normalizeWeightByDatasetState(
            await options.invoke("weightBy:getState", { dataset: source })
        );
        const preserveWeight = !!weightState.weighting
            && (
                targetVariableSet.size === 0
                || targetVariableSet.has(weightState.weighting)
            );

        if (preserveWeight) {
            await options.invoke("weightBy:setDatasetState", {
                dataset: target,
                weighting: weightState.weighting,
                datasets
            });
        } else {
            await options.invoke("weightBy:clearDatasetState", {
                dataset: target,
                datasets
            });
        }

        return {
            source,
            target,
            grouping,
            sortdataset: splitState.sortdataset,
            weighting: preserveWeight ? weightState.weighting : ""
        };
    });
};
