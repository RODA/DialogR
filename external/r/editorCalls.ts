import type {
    ProfileCustomJSApi
} from "dialogforge/shared/dialog-runtime/renderer/modules/profileCustomJSApi";
import {
    bindSelectExpressionMonaco
} from "./selectExpressionEditor";
import type {
    DialogMonacoBinding
} from "./selectExpressionEditor";
import type {
    DialogRRuntimeApi
} from "./runtimeApi";


interface EditorCallOptions {
    api: ProfileCustomJSApi;
    runtimeApi: DialogRRuntimeApi;
    getDatasetVariables: (datasetName: unknown) => Promise<unknown[]>;
}


export const registerEditorCalls = function(options: EditorCallOptions): void {
    const register = options.api.registerExternalCall;

    if (!register) {
        return;
    }

    let expressionEditor: DialogMonacoBinding | null = null;

    register("bindSelectExpressionMonaco", async (parameters) => {
        expressionEditor?.destroy();
        expressionEditor = bindSelectExpressionMonaco(
            options.api,
            options.runtimeApi,
            options.getDatasetVariables,
            parameters
        );

        return null;
    });

    register("refreshSelectExpressionMonaco", async () => {
        await expressionEditor?.refresh();

        return null;
    });
};
