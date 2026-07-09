import type {
    ProfileCustomJSContext
} from "dialogforge/shared/dialog-runtime/renderer/modules/profileCustomJSApi";


const mainExternalCalls = new Map<string, string>([
    ["splitBy:getState", "getSplitByState"],
    ["splitBy:setDatasetState", "setSplitByState"],
    ["splitBy:clearDatasetState", "clearSplitByState"],
    ["weightBy:getState", "getWeightByState"],
    ["weightBy:setDatasetState", "setWeightByState"],
    ["weightBy:clearDatasetState", "clearWeightByState"],
    ["filter:getState", "getFilterState"],
    ["filter:setDatasetState", "setFilterState"],
    ["filter:clearDatasetState", "clearFilterState"]
]);


export const createDialogRExternalInvoker = function(context: ProfileCustomJSContext) {
    return async function(channel: string, payload?: unknown): Promise<unknown> {
        if (!context.coms || typeof context.coms.invoke !== "function") {
            throw new TypeError(`Missing coms.invoke for ${channel}`);
        }

        const externalName = mainExternalCalls.get(channel);

        if (!externalName) {
            return await context.coms.invoke(channel, payload);
        }

        const result = await context.coms.invoke(
            "base-app:callDialogExternal",
            externalName,
            payload || {}
        );

        const response = result && typeof result === "object"
            ? result as Record<string, unknown>
            : {};

        if (response.status !== "ready") {
            throw new Error(
                String(
                    response.message
                    || `Dialog external call failed: ${externalName}`
                )
            );
        }

        return response.value;
    };
};
