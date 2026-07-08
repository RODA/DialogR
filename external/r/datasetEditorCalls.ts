import type {
    ProfileCustomJSApi
} from "dialogforge/shared/dialog-runtime/renderer/modules/profileCustomJSApi";
import {
    normalizeDatasetName
} from "./datasetState";
import {
    asPayloadRecord
} from "./runtimeApi";


interface DatasetEditorCallOptions {
    api: ProfileCustomJSApi;
    invoke: (channel: string, payload?: unknown) => Promise<unknown>;
    getDatasetVariables: (datasetName: unknown) => Promise<unknown[]>;
}


export const registerDatasetEditorCalls = function(
    options: DatasetEditorCallOptions
): void {
    const register = options.api.registerExternalCall;

    if (!register) {
        return;
    }

    register("refreshDatasetEditor", async (parameters) => {
        const payload = asPayloadRecord(parameters);
        const datasetName = normalizeDatasetName(
            payload.datasetName || payload.name
        );

        if (!datasetName) {
            return false;
        }

        return await options.invoke("datasetEditor:refreshDataset", {
            datasetName
        });
    });

    register("getDatasetVariablesForDialog", async (parameters) => {
        const payload = asPayloadRecord(parameters);

        return await options.getDatasetVariables(payload.dataset);
    });
};
