import {
    PRODUCT_CONTRIBUTION_CONTRACT_VERSION,
    type ProductConsoleStateChip,
    type ProductContribution,
    type ProductContributionContext
} from "@dialogforge/core";


const consoleStateChipMutationCalls = [
    "setSplitByState",
    "clearSplitByState",
    "setWeightByState",
    "clearWeightByState",
    "inheritSubsetDatasetState"
];


const readConsoleStateChips = async function(
    context: ProductContributionContext,
    dataset: string
): Promise<ProductConsoleStateChip[]> {
    const [weightState, splitState] = await Promise.all([
        context.callSharedDialogExternal("getWeightByState", { dataset }),
        context.callSharedDialogExternal("getSplitByState", { dataset })
    ]);
    const weight = weightState && typeof weightState === "object"
        ? String((weightState as { weighting?: unknown }).weighting || "").trim()
        : "";
    const split = splitState && typeof splitState === "object" &&
        Array.isArray((splitState as { grouping?: unknown }).grouping)
        ? (splitState as { grouping: unknown[] }).grouping
            .map((name) => String(name || "").trim())
            .filter(Boolean)
            .join(", ")
        : "";

    return [
        {
            id: "weight-variable",
            labelKey: "Weight",
            accessibilityLabelKey: "Weight variable",
            value: weight
        },
        {
            id: "split-variables",
            labelKey: "Split",
            accessibilityLabelKey: "Split variables",
            value: split
        }
    ];
};


export const productContribution:
    ProductContribution = {
        id: "DialogR",
        dialogForgeProductContract:
            PRODUCT_CONTRIBUTION_CONTRACT_VERSION,
        consoleStateChipMutationCalls,
        readConsoleStateChips,
        createDialogExternalCallHosts: function() {
            return {};
        }
    };

export const dialogRProductContribution = productContribution;

export default productContribution;
