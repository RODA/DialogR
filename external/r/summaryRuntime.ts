import {
    normalizeDatasetName,
    normalizeGrouping
} from "./datasetState";
import type {
    DialogRRuntimeApi
} from "./runtimeApi";


const summaryMeasureNames: Record<string, string> = {
    mode: "mode",
    mean: "mean",
    median: "median",
    iqr: "iqr",
    range: "range",
    var: "var",
    sd: "sd"
};


const summaryMeasureFunctions: Record<string, [string, boolean]> = {
    mode: ["wmode", true],
    mean: ["wmean", true],
    median: ["wmedian", true],
    iqr: ["wIQR", true],
    range: ["range", false],
    var: ["wvar", true],
    sd: ["wsd", true]
};


export const summaryMeasureOrder = [
    "mode",
    "mean",
    "median",
    "iqr",
    "range",
    "var",
    "sd"
];


const normalizeSummaryVariables = function(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.map((item) => {
        return String(item || "").trim();
    }).filter(Boolean);
};


const indentNestedExpression = function(value: string): string {
    const lines = String(value || "").split("\n");

    if (lines.length <= 1) {
        return String(value || "");
    }

    return lines.map((line, index) => {
        return index === 0 ? line : `  ${line}`;
    }).join("\n");
};


export const getSummaryControls = function(payload: unknown): Record<string, string> {
    const source = payload && typeof payload === "object" && !Array.isArray(payload)
        ? payload as Record<string, unknown>
        : {};
    const controlsSource = source.controls
        && typeof source.controls === "object"
        && !Array.isArray(source.controls)
        ? source.controls as Record<string, unknown>
        : source;
    const statistics = controlsSource.statistics
        && typeof controlsSource.statistics === "object"
        && !Array.isArray(controlsSource.statistics)
        ? controlsSource.statistics as Record<string, unknown>
        : {};

    return {
        datasets: String(controlsSource.datasets || "").trim(),
        variables: String(controlsSource.variables || "").trim(),
        summary: String(statistics.summary || "").trim(),
        quantile: String(statistics.quantile || "").trim(),
        mode: String(statistics.mode || "").trim(),
        mean: String(statistics.mean || "").trim(),
        median: String(statistics.median || "").trim(),
        iqr: String(statistics.iqr || "").trim(),
        range: String(statistics.range || "").trim(),
        var: String(statistics.var || "").trim(),
        sd: String(statistics.sd || "").trim()
    };
};


export const selectedFromRuntime = function(
    runtimeApi: DialogRRuntimeApi,
    elementName: string
): string[] {
    if (!elementName || typeof runtimeApi.getSelected !== "function") {
        return [];
    }

    const selected = runtimeApi.getSelected(elementName);

    return Array.isArray(selected)
        ? selected.map((item) => String(item || "").trim()).filter(Boolean)
        : [];
};


export const isRuntimeChecked = function(
    runtimeApi: DialogRRuntimeApi,
    elementName: string
): boolean {
    return !!elementName
        && typeof runtimeApi.isChecked === "function"
        && runtimeApi.isChecked(elementName);
};


export const getSummarySelection = function(
    runtimeApi: DialogRRuntimeApi,
    payload: unknown
) {
    const controls = getSummaryControls(payload);

    return {
        controls,
        dataset: selectedFromRuntime(runtimeApi, controls.datasets)[0] || "<dataset>",
        variables: selectedFromRuntime(runtimeApi, controls.variables),
        summary: isRuntimeChecked(runtimeApi, controls.summary),
        quantile: isRuntimeChecked(runtimeApi, controls.quantile),
        measures: summaryMeasureOrder.filter((name) => {
            return isRuntimeChecked(runtimeApi, controls[name]);
        })
    };
};


export const clearSummaryStatisticErrors = function(
    runtimeApi: DialogRRuntimeApi,
    controls: Record<string, string>
): void {
    if (typeof runtimeApi.clearError !== "function") {
        return;
    }

    const clearError = runtimeApi.clearError;

    ["summary", "quantile", ...summaryMeasureOrder].forEach((key) => {
        if (controls[key]) {
            clearError(controls[key]);
        }
    });
};


export const buildSummaryCommandText = function(payload: unknown): string {
    const source = payload && typeof payload === "object" && !Array.isArray(payload)
        ? payload as Record<string, unknown>
        : {};
    const dataset = normalizeDatasetName(source.dataset);
    const variables = normalizeSummaryVariables(source.variables);

    if (!dataset || dataset === "<dataset>" || variables.length === 0) {
        return "";
    }

    const datasetExpression = String(source.datasetExpression || dataset).trim() || dataset;
    const datasetReference = datasetExpression !== "<dataset>"
        ? indentNestedExpression(datasetExpression)
        : dataset;
    const analysisDataset = variables.length > 1
        ? `subset(${datasetReference}, select = c(${variables.join(", ")}))`
        : datasetReference;
    const analysisVariable = variables.length > 1 ? "." : variables[0];
    const weight = String(source.weight || "").trim();
    const split = normalizeGrouping(source.split);
    const splitArgument = split.length === 1
        ? `split.by = ${split[0]}`
        : split.length > 1
            ? `split.by = c(${split.join(", ")})`
            : "";

    const addWeight = function(command: string, useWeight = true): string {
        return useWeight && weight ? `${command}, wt = ${weight}` : command;
    };

    const wrapUsing = function(analysis: string): string {
        let command = `using(\n  ${analysisDataset},\n  ${analysis}`;

        if (splitArgument) {
            command += `,\n  ${splitArgument}`;
        }

        return `${command}\n)`;
    };

    let analysis = "";

    if (source.summary === true) {
        analysis = `${addWeight(`wsummary(${analysisVariable}`)})`;
    } else if (source.quantile === true) {
        analysis = `${addWeight(`wquantile(${analysisVariable}`)})`;
    } else {
        const requestedMeasures = normalizeSummaryVariables(source.measures).filter((item) => {
            return Object.prototype.hasOwnProperty.call(summaryMeasureNames, item);
        });
        const measures = summaryMeasureOrder.filter((item) => {
            return requestedMeasures.includes(item);
        });

        if (measures.length === 0) {
            return "";
        }

        if (variables.length === 1 && measures.length === 1) {
            const summaryFunction = summaryMeasureFunctions[measures[0]];

            analysis = `${addWeight(
                `${summaryFunction[0]}(${analysisVariable}`,
                summaryFunction[1]
            )})`;
        } else {
            analysis = `wmeasures(${analysisVariable}, what = c("${measures.join('", "')}")`;

            if (weight) {
                analysis += `, wt = ${weight}`;
            }

            analysis += ")";
        }
    }

    return `${wrapUsing(analysis)}\n`;
};
