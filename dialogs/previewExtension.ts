import type {
    ProductDialogPreviewExtension
} from "dialogforge/shared/dialog-runtime/productDialogPreviewExtension";
import {
    dialogRDialogRuntimeAdapterApi
} from "../runtime/dialogRDialogRuntimeAdapter";


export const productDialogPreviewExtension: ProductDialogPreviewExtension = {
    applyExternalCallResult: function(context) {
        return dialogRDialogRuntimeAdapterApi.applyDialogRExternalCallResultToControls(
            context.model,
            context.name,
            context.value,
            context.parameters
        );
    }
};
