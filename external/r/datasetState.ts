export interface SplitByDatasetState {
    grouping: string[];
    sortdataset: boolean;
}


export interface WeightByDatasetState {
    weighting: string;
}


export interface FilterDatasetState {
    command: string;
}


export const normalizeDatasetName = function(value: unknown): string {
    return String(value || "").trim();
};


export const normalizeGrouping = function(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    const seen = new Set<string>();
    const result: string[] = [];

    value.forEach((item) => {
        const next = String(item || "").trim();

        if (!next || seen.has(next)) {
            return;
        }

        seen.add(next);
        result.push(next);
    });

    return result;
};


export const normalizeDatasetState = function(value: unknown): SplitByDatasetState {
    const source = value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};

    return {
        grouping: normalizeGrouping(source.grouping),
        sortdataset: source.sortdataset === true
    };
};


export const normalizeWeightByDatasetState = function(
    value: unknown
): WeightByDatasetState {
    const source = value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};

    return {
        weighting: String(source.weighting ?? "").trim()
    };
};


export const normalizeFilterDatasetState = function(
    value: unknown
): FilterDatasetState {
    const source = value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};

    return {
        command: String(source.command ?? "")
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .trim()
    };
};
