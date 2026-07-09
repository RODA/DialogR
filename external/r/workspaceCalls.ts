import type {
    ProfileCustomJSApi,
    ProfileCustomJSContext
} from "dialogforge/shared/dialog-runtime/renderer/modules/profileCustomJSApi";
import type {
    DialogRRuntimeApi
} from "./runtimeApi";
import {
    createWorkspaceBindings
} from "./workspaceBindings";


interface WorkspaceCallOptions {
    api: ProfileCustomJSApi;
    runtimeApi: DialogRRuntimeApi;
    context: ProfileCustomJSContext;
    getDatasetVariables: (datasetName: unknown) => Promise<unknown[]>;
}


export const registerWorkspaceCalls = function(
    options: WorkspaceCallOptions
): void {
    const register = options.api.registerExternalCall;

    if (!register) {
        return;
    }

    const bindings = createWorkspaceBindings({
        runtimeApi: options.runtimeApi,
        context: options.context,
        getDatasetVariables: options.getDatasetVariables
    });

    register("bindSummaryWorkspaceUpdates", async (parameters) => {
        return bindings.bindSummary(parameters);
    });
    register("bindFrequenciesWorkspace", async (parameters) => {
        return bindings.bindFrequencies(parameters);
    });
    register("bindCrosstabsWorkspace", async (parameters) => {
        return bindings.bindCrosstabs(parameters);
    });

    const baseBindObjects = options.api.bindObjects;
    options.api.bindObjects = function(parameters) {
        if (typeof baseBindObjects === "function") {
            baseBindObjects(parameters);
        }

        const refresh = async function(): Promise<void> {
            await bindings.bindObjects(parameters);
        };

        const source = parameters && typeof parameters === "object" && !Array.isArray(parameters)
            ? parameters as Record<string, unknown>
            : {};

        if (source.autoRefresh !== false) {
            void refresh();
        }

        return { refresh };
    };
};
