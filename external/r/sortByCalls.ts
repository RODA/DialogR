import type {
    ProfileCustomJSApi
} from "dialogforge/shared/dialog-runtime/renderer/modules/profileCustomJSApi";
import {
    setButtonDirection
} from "./buttonDirection";
import {
    addSortByVariables,
    buildSortByAvailableVariables,
    buildSortByChoiceItems,
    buildSortByCommandText,
    getSortByButtonDirection,
    getSortByTargetDataset,
    keepSortByVariables,
    removeSortByVariables
} from "./sortByRuntime";
import {
    asPayloadRecord
} from "./runtimeApi";


export const registerSortByCalls = function(api: ProfileCustomJSApi): void {
    const register = api.registerExternalCall;

    if (!register) {
        return;
    }

    register("buildSortByCommand", async (parameters) => {
        return buildSortByCommandText(parameters);
    });
    register("setSortByButtonDirection", async (parameters) => {
        const payload = asPayloadRecord(parameters);
        const direction = payload.direction === "left" ? "left" : "right";

        return setButtonDirection(
            api,
            direction,
            "Remove selected sorting variable(s)",
            "Add selected sorting variable(s)"
        );
    });
    register("getSortByChoiceItems", async (parameters) => {
        return buildSortByChoiceItems(parameters);
    });
    register("getSortByAvailableVariables", async (parameters) => {
        return buildSortByAvailableVariables(parameters);
    });
    register("addSortByVariables", async (parameters) => {
        return addSortByVariables(parameters);
    });
    register("removeSortByVariables", async (parameters) => {
        return removeSortByVariables(parameters);
    });
    register("keepSortByVariables", async (parameters) => {
        return keepSortByVariables(parameters);
    });
    register("getSortByButtonDirection", async (parameters) => {
        return getSortByButtonDirection(parameters);
    });
    register("getSortByTargetDataset", async (parameters) => {
        return getSortByTargetDataset(parameters);
    });
};
