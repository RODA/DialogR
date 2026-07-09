import type {
    ProfileCustomJSApi
} from "dialogforge/shared/dialog-runtime/renderer/modules/profileCustomJSApi";


export const setButtonDirection = function(
    api: ProfileCustomJSApi,
    direction: "left" | "right",
    titleLeft: string,
    titleRight: string
): "left" | "right" | null {
    if (typeof api.getElementNode !== "function") {
        return null;
    }

    const host = api.getElementNode("addremove");

    if (!(host instanceof HTMLElement)) {
        return direction;
    }

    const icon = host.querySelector(".smart-button-icon");

    if (!(icon instanceof HTMLElement)) {
        return direction;
    }

    icon.classList.remove("codicon-arrow-left", "codicon-arrow-right");
    icon.classList.add(
        direction === "left" ? "codicon-arrow-left" : "codicon-arrow-right"
    );

    const title = direction === "left" ? titleLeft : titleRight;

    host.title = title;
    host.setAttribute("aria-label", title);

    return direction;
};
