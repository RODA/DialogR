const normalizeDatasetName = function(value: unknown): string {
    return String(value || "").trim();
};


const normalizeSortBySelection = function(value: unknown): string[] {
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


const sortByVariableName = function(value: unknown): string {
    return String(value || "").replace(/:(asc|desc)$/i, "").trim();
};


const sortByDirectionFlag = function(value: unknown): string {
    return /:desc$/i.test(String(value || "").trim()) ? "TRUE" : "FALSE";
};


const asRObjectReference = function(value: unknown): string {
    const name = String(value || "").trim();

    if (!name) {
        return "";
    }

    if (/^[A-Za-z.][A-Za-z0-9._]*$/.test(name) && !/^\.[0-9]/.test(name)) {
        return name;
    }

    return `\`${name.replace(/`/g, "\\`")}\``;
};


const asRDollarReference = function(dataset: unknown, variable: unknown): string {
    const datasetReference = asRObjectReference(dataset);
    const variableName = String(variable || "").trim();

    if (!variableName) {
        return "";
    }

    if (/^[A-Za-z.][A-Za-z0-9._]*$/.test(variableName) && !/^\.[0-9]/.test(variableName)) {
        return `${datasetReference}$${variableName}`;
    }

    return `${datasetReference}$\`${variableName.replace(/`/g, "\\`")}\``;
};


export const buildSortByCommandText = function(payload: unknown): string {
    const source = payload && typeof payload === "object" && !Array.isArray(payload)
        ? payload as Record<string, unknown>
        : {};
    const dataset = normalizeDatasetName(source.dataset);

    if (!dataset) {
        return "";
    }

    const sorting = normalizeSortBySelection(source.sorting);

    if (sorting.length === 0) {
        return "";
    }

    const requestedName = String(source.datasetName || "").trim();
    const targetDataset = source.createNew === true && requestedName
        ? requestedName
        : dataset;
    const orderTerms = sorting
        .map((item) => asRDollarReference(dataset, sortByVariableName(item)))
        .filter(Boolean);
    const directionTerms = sorting.map((item) => sortByDirectionFlag(item));

    if (orderTerms.length === 0) {
        return "";
    }

    const hasDecreasing = directionTerms.includes("TRUE");
    const decreasingArgument = directionTerms.length === 1
        ? directionTerms[0]
        : `c(${directionTerms.join(", ")})`;
    const orderCall = hasDecreasing
        ? `order(${orderTerms.join(", ")}, decreasing = ${decreasingArgument})`
        : `order(${orderTerms.join(", ")})`;

    return `${asRObjectReference(targetDataset)} <- ${asRObjectReference(dataset)}[${orderCall}, ]`;
};


export const buildSortByChoiceItems = function(
    payload: unknown
): Array<{ text: string; state: "asc" | "desc" }> {
    const source = payload && typeof payload === "object" && !Array.isArray(payload)
        ? payload as Record<string, unknown>
        : {};

    return normalizeSortBySelection(source.sorting).map((item) => {
        return {
            text: sortByVariableName(item),
            state: /:desc$/i.test(String(item || "").trim()) ? "desc" : "asc"
        };
    });
};


export const buildSortByAvailableVariables = function(payload: unknown): string[] {
    const source = payload && typeof payload === "object" && !Array.isArray(payload)
        ? payload as Record<string, unknown>
        : {};
    const variables = Array.isArray(source.variables)
        ? source.variables.map((item) => String(item || "").trim()).filter(Boolean)
        : [];
    const selected = new Set(
        normalizeSortBySelection(source.sorting).map((item) => sortByVariableName(item))
    );

    return variables.filter((item) => {
        return !selected.has(item);
    });
};


export const addSortByVariables = function(payload: unknown): string[] {
    const source = payload && typeof payload === "object" && !Array.isArray(payload)
        ? payload as Record<string, unknown>
        : {};
    const current = normalizeSortBySelection(source.sorting);
    const existing = new Set(current.map((item) => sortByVariableName(item)));
    const selected = Array.isArray(source.selected)
        ? source.selected.map((item) => String(item || "").trim()).filter(Boolean)
        : [];
    const result = current.slice();

    selected.forEach((item) => {
        if (existing.has(item)) {
            return;
        }

        existing.add(item);
        result.push(item);
    });

    return result;
};


export const removeSortByVariables = function(payload: unknown): string[] {
    const source = payload && typeof payload === "object" && !Array.isArray(payload)
        ? payload as Record<string, unknown>
        : {};
    const selected = new Set(
        Array.isArray(source.selected)
            ? source.selected.map((item) => sortByVariableName(item)).filter(Boolean)
            : []
    );

    return normalizeSortBySelection(source.sorting).filter((item) => {
        return !selected.has(sortByVariableName(item));
    });
};


export const keepSortByVariables = function(payload: unknown): string[] {
    const source = payload && typeof payload === "object" && !Array.isArray(payload)
        ? payload as Record<string, unknown>
        : {};
    const variables = new Set(
        Array.isArray(source.variables)
            ? source.variables.map((item) => String(item || "").trim()).filter(Boolean)
            : []
    );

    return normalizeSortBySelection(source.sorting).filter((item) => {
        return variables.has(sortByVariableName(item));
    });
};


export const getSortByButtonDirection = function(payload: unknown): "left" | "right" {
    const source = payload && typeof payload === "object" && !Array.isArray(payload)
        ? payload as Record<string, unknown>
        : {};
    const choiceSelected = Array.isArray(source.choiceSelected)
        ? source.choiceSelected.map((item) => String(item || "").trim()).filter(Boolean)
        : [];
    const variableSelected = Array.isArray(source.variableSelected)
        ? source.variableSelected.map((item) => String(item || "").trim()).filter(Boolean)
        : [];

    return choiceSelected.length > 0 && variableSelected.length === 0 ? "left" : "right";
};


export const getSortByTargetDataset = function(payload: unknown): string {
    const source = payload && typeof payload === "object" && !Array.isArray(payload)
        ? payload as Record<string, unknown>
        : {};
    const dataset = normalizeDatasetName(source.dataset);
    const requestedName = String(source.datasetName || "").trim();

    return source.createNew === true && requestedName ? requestedName : dataset;
};
