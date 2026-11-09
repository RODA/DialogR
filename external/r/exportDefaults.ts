import type { DialogExternalCallHost, ProductContributionContext } from "@dialogforge/core";

export const createExportDefaultsHost = function(context: ProductContributionContext): DialogExternalCallHost {
    const callName = "DialogR.exportDefaultVersion";

    return {
        supports: name => name === "exportDefaultVersion",
        async call(name, parameters = {}) {
            if (name !== callName && name !== "exportDefaultVersion") {
                return { status: "unsupported", name, value: null, message: "Unknown export operation." };
            }

            const dataset = String(parameters.dataset || "");
            const format = parameters.format;
            if (!dataset || (format !== "dta" && format !== "xpt")) {
                return { status: "invalid", name, value: null, message: "Choose a dataset and export format." };
            }

            const metadata = format === "dta" ? "stata_metadata" : "sas_metadata";
            const fallback = format === "dta" ? 14 : 5;
            const code = `cat(attr(get(${JSON.stringify(dataset)}, envir = .GlobalEnv, inherits = FALSE), "${metadata}", exact = TRUE)[["version", exact = TRUE]])`;
            const result = await context.executeRuntimeMethod({
                method: "evaluate_code",
                params: { code, mode: "silent" },
                source: callName
            });
            const version = String(result.value ?? "").trim();
            const parsed = version ? Number(version) : fallback;
            const value = result.status === "ready" && Number.isInteger(parsed) ? parsed : null;

            return { status: "ready", name, value, message: "" };
        }
    };
};
