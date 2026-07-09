import type {
    ProfileCustomJSApi
} from "dialogforge/shared/dialog-runtime/renderer/modules/profileCustomJSApi";


export interface DialogRRuntimeApi extends ProfileCustomJSApi {
    clearContent?: (elementName: string) => void;
    clearError?: (elementName: string) => void;
    getDatasetVariables?: (datasetName: string) => Promise<unknown[]>;
    getSelected: (elementName: string) => unknown;
    isChecked?: (elementName: string) => boolean;
    listColumns?: (datasetName: string) => unknown[];
    listObjects: (objectType: string) => unknown[];
    onChange?: (elementName: string, handler: () => void) => void;
    setValue: (elementName: string, value: unknown) => void;
    triggerChange: (elementName: string) => void;
    uncheck?: (elementName: string) => void;
    updateSyntax?: (command: string) => void;
}


export const asPayloadRecord = function(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {};
    }

    return value as Record<string, unknown>;
};


export const asOptionalArray = function(value: unknown): unknown[] | undefined {
    return Array.isArray(value) ? value : undefined;
};
