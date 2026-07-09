import type {
    ProfileCustomJSApi,
    ProfileCustomJSContext
} from "dialogforge/shared/dialog-runtime/renderer/modules/profileCustomJSApi";
import {
    registerDatasetEditorCalls
} from "../external/r/datasetEditorCalls";
import {
    registerDatasetStateCalls
} from "../external/r/datasetStateCalls";
import {
    registerEditorCalls
} from "../external/r/editorCalls";
import {
    createDialogRExternalInvoker
} from "../external/r/externalCalls";
import type {
    DialogRRuntimeApi
} from "../external/r/runtimeApi";
import {
    normalizeDatasetName
} from "../external/r/datasetState";
import {
    registerSortByCalls
} from "../external/r/sortByCalls";
import {
    registerSummaryCalls
} from "../external/r/summaryCalls";
import {
    registerWorkspaceCalls
} from "../external/r/workspaceCalls";


const createDatasetVariableReader = function(runtimeApi: DialogRRuntimeApi) {
    return async function(datasetName: unknown): Promise<unknown[]> {
        const dataset = normalizeDatasetName(datasetName);

        if (!dataset) {
            return [];
        }

        if (runtimeApi.getDatasetVariables) {
            const variables = await runtimeApi.getDatasetVariables(dataset);

            if (Array.isArray(variables) && variables.length) {
                return variables;
            }
        }

        if (runtimeApi.listColumns) {
            return runtimeApi.listColumns(dataset);
        }

        return [];
    };
};


export const extendCustomJSApi = async function(
    api: ProfileCustomJSApi,
    context: ProfileCustomJSContext
): Promise<void> {
    if (!api.registerExternalCall) {
        return;
    }

    const runtimeApi = api as unknown as DialogRRuntimeApi;
    const invoke = createDialogRExternalInvoker(context);
    const getDatasetVariables = createDatasetVariableReader(runtimeApi);

    registerDatasetStateCalls({
        api,
        invoke,
        getDatasetVariables
    });
    registerSortByCalls(api);
    registerDatasetEditorCalls({
        api,
        invoke,
        getDatasetVariables
    });
    registerSummaryCalls({
        api,
        runtimeApi,
        invoke
    });
    registerEditorCalls({
        api,
        runtimeApi,
        getDatasetVariables
    });
    registerWorkspaceCalls({
        api,
        runtimeApi,
        context,
        getDatasetVariables
    });
};
