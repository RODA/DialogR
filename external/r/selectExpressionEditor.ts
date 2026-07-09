import type {
    ProfileCustomJSApi
} from "dialogforge/shared/dialog-runtime/renderer/modules/profileCustomJSApi";
import {
    ensureConsoleSyntaxReady,
    CONSOLE_THEME_NAME
} from "./consoleSyntax";
import type * as Monaco from "monaco-editor";

export interface DialogMonacoBinding {
    refresh: () => Promise<void>;
    destroy: () => void;
}

interface DialogRuntimeApi {
    getSelected: (elementName: string) => unknown;
    setValue?: (elementName: string, value: unknown) => void;
    triggerChange?: (elementName: string) => void;
}

interface TokenBounds {
    start: number;
    end: number;
    token: string;
}

interface ExpressionEditorElements {
    editorHost: HTMLDivElement;
    disabledOverlay: HTMLDivElement;
    suggestPopup: HTMLDivElement;
}

interface Disposable {
    dispose?: () => void;
}

interface SuggestionContext {
    position: {
        lineNumber: number;
        column: number;
    };
    bounds: TokenBounds;
    token: string;
}

interface ExpressionEditorState {
    variableNames: string[];
    editor: Monaco.editor.IStandaloneCodeEditor | null;
    changeDisposable: Disposable | null;
    cursorDisposable: Disposable | null;
    blurDisposable: Disposable | null;
    suppressRuntimeSync: boolean;
    suggestTimer: number | null;
    suggestions: string[];
    activeSuggestionIndex: number;
}


const createEditorElements = function(container: HTMLElement): ExpressionEditorElements {
    container.querySelectorAll(".dm-expression-monaco-host").forEach((node) => {
        node.remove();
    });

    const editorHost = document.createElement("div");

    editorHost.className = "dm-expression-monaco-host";
    editorHost.style.position = "absolute";
    editorHost.style.inset = "0";
    editorHost.style.boxSizing = "border-box";
    editorHost.style.padding = "3px 5px";
    editorHost.style.border = "1px solid var(--input-border-color, #8c8c8c)";
    editorHost.style.borderRadius = "4px";
    editorHost.style.background = "#ffffff";
    editorHost.style.overflow = "visible";
    editorHost.style.zIndex = "1";
    container.appendChild(editorHost);

    const disabledOverlay = document.createElement("div");

    disabledOverlay.className = "dm-expression-monaco-disabled-overlay";
    disabledOverlay.style.position = "absolute";
    disabledOverlay.style.inset = "0";
    disabledOverlay.style.borderRadius = "4px";
    disabledOverlay.style.background = "var(--input-disabled-background-color, #dedede)";
    disabledOverlay.style.display = "none";
    disabledOverlay.style.pointerEvents = "none";
    disabledOverlay.style.zIndex = "3";
    editorHost.appendChild(disabledOverlay);

    const suggestPopup = document.createElement("div");

    suggestPopup.className = "dm-expression-monaco-suggest";
    suggestPopup.style.position = "absolute";
    suggestPopup.style.minWidth = "180px";
    suggestPopup.style.maxWidth = "260px";
    suggestPopup.style.maxHeight = "180px";
    suggestPopup.style.overflowY = "auto";
    suggestPopup.style.padding = "2px 0";
    suggestPopup.style.border = "1px solid #b8b8b8";
    suggestPopup.style.borderRadius = "4px";
    suggestPopup.style.background = "#ffffff";
    suggestPopup.style.boxShadow = "0 3px 10px rgba(0, 0, 0, 0.16)";
    suggestPopup.style.display = "none";
    suggestPopup.style.zIndex = "4";
    editorHost.appendChild(suggestPopup);

    return {
        editorHost,
        disabledOverlay,
        suggestPopup
    };
};


const isSyntacticRName = function(value: unknown): boolean {
    const name = String(value || "").trim();

    return !!name
        && /^[A-Za-z.][A-Za-z0-9._]*$/.test(name)
        && !/^\.[0-9]/.test(name);
};


const asRCompletionName = function(value: unknown): string {
    const name = String(value || "").trim();

    if (!name) {
        return "";
    }

    if (isSyntacticRName(name)) {
        return name;
    }

    return `\`${name.replace(/`/g, "\\`")}\``;
};


export const getVariableDisplayName = function(value: unknown): string {
    if (typeof value === "string") {
        return value.trim();
    }

    if (value && typeof value === "object") {
        const source = value as Record<string, unknown>;
        const name = String(
            source.name ?? source.text ?? source.label ?? ""
        ).trim();

        if (name) {
            return name;
        }
    }

    return String(value || "").trim();
};


const isAutocompleteTokenCharacter = function(character: string): boolean {
    return /[A-Za-z0-9._`]/.test(character);
};


const getAutocompleteTokenBounds = function(
    value: string,
    caret: number
): TokenBounds {
    const text = String(value || "");
    const safeCaret = Math.max(
        0,
        Math.min(Number.isFinite(caret) ? caret : text.length, text.length)
    );
    let start = safeCaret;
    let end = safeCaret;

    while (start > 0 && isAutocompleteTokenCharacter(text[start - 1])) {
        start -= 1;
    }

    while (end < text.length && isAutocompleteTokenCharacter(text[end])) {
        end += 1;
    }

    return {
        start,
        end,
        token: text.slice(start, safeCaret)
    };
};


const rankAutocompleteItems = function(token: string, items: string[]): string[] {
    const needle = String(token || "")
        .replace(/`/g, "")
        .trim()
        .toLowerCase();
    const unique = Array.from(new Set(items.map((item) => {
        return String(item || "").trim();
    }).filter(Boolean)));

    if (!needle) {
        return unique.slice().sort((left, right) => {
            return left.localeCompare(right);
        });
    }

    return unique.filter((item) => {
        return item.toLowerCase().startsWith(needle);
    }).sort((left, right) => {
        return left.localeCompare(right);
    });
};

export const bindSelectExpressionMonaco = function(
    api: ProfileCustomJSApi,
    runtimeApi: DialogRuntimeApi,
    getDatasetVariablesForDialog: (datasetName: unknown) => Promise<unknown[]>,
    payload?: unknown
): DialogMonacoBinding | null {
    if (typeof api.getElementNode !== "function") {
        return null;
    }

    const source = payload && typeof payload === "object" && !Array.isArray(payload)
        ? payload as Record<string, unknown>
        : {};
    const inputElement = String(source.input || "expression").trim();
    const datasetElement = String(source.dataset || "c_datasets").trim();

    if (!inputElement || !datasetElement) {
        return null;
    }

    const host = api.getElementNode(inputElement);
    const textarea = host instanceof HTMLTextAreaElement
        ? host
        : host?.querySelector?.("textarea") as HTMLTextAreaElement | null;

    if (!(textarea instanceof HTMLTextAreaElement)) {
        return null;
    }

    const wrapper = textarea.parentElement instanceof HTMLElement
        ? textarea.parentElement
        : null;

    if (!wrapper) {
        return null;
    }

    const {
        editorHost,
        disabledOverlay,
        suggestPopup
    } = createEditorElements(wrapper);
    const state: ExpressionEditorState = {
        variableNames: [],
        editor: null,
        changeDisposable: null,
        cursorDisposable: null,
        blurDisposable: null,
        suppressRuntimeSync: false,
        suggestTimer: null,
        suggestions: [],
        activeSuggestionIndex: -1
    };

    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    textarea.setAttribute("aria-hidden", "true");

    const isEditorDisabled = function(): boolean {
        return textarea.disabled || wrapper.classList.contains("dm-disabled");
    };

    const hideSuggestions = function(): void {
        state.suggestions = [];
        state.activeSuggestionIndex = -1;
        suggestPopup.style.display = "none";
        suggestPopup.replaceChildren();
    };

    const readSuggestionContext = function(): SuggestionContext | null {
        if (!state.editor) {
            return null;
        }

        const position = state.editor.getPosition?.();
        const model = state.editor.getModel?.();

        if (!position || !model) {
            return null;
        }

        const line = String(model.getLineContent(position.lineNumber) || "");
        const bounds = getAutocompleteTokenBounds(
            line,
            Math.max(0, Number(position.column || 1) - 1)
        );

        return {
            position,
            bounds,
            token: bounds.token.replace(/`/g, "").trim()
        };
    };

    const applySuggestion = function(value: string): void {
        const context = readSuggestionContext();

        if (!context || !state.editor) {
            return;
        }

        const insertText = asRCompletionName(value);

        state.editor.executeEdits("dialogr-select-expression-suggest", [{
            range: {
                startLineNumber: context.position.lineNumber,
                startColumn: context.bounds.start + 1,
                endLineNumber: context.position.lineNumber,
                endColumn: context.bounds.end + 1
            },
            text: insertText,
            forceMoveMarkers: true
        }]);
        state.editor.setPosition({
            lineNumber: context.position.lineNumber,
            column: context.bounds.start + insertText.length + 1
        });
        hideSuggestions();
        state.editor.focus?.();
    };

    const renderSuggestions = function(): void {
        if (!state.editor || isEditorDisabled()) {
            hideSuggestions();
            return;
        }

        const context = readSuggestionContext();

        if (!context || context.token.length < 1) {
            hideSuggestions();
            return;
        }

        const ranked = rankAutocompleteItems(
            context.token,
            state.variableNames
        ).slice(0, 20);

        if (!ranked.length) {
            hideSuggestions();
            return;
        }

        state.suggestions = ranked;

        if (
            state.activeSuggestionIndex < 0
            || state.activeSuggestionIndex >= ranked.length
        ) {
            state.activeSuggestionIndex = 0;
        }

        suggestPopup.replaceChildren();

        ranked.forEach((item, index) => {
            const row = document.createElement("div");

            row.textContent = item;
            row.style.padding = "3px 8px";
            row.style.whiteSpace = "nowrap";
            row.style.cursor = "default";
            row.style.background = index === state.activeSuggestionIndex
                ? "#1f66b3"
                : "#ffffff";
            row.style.color = index === state.activeSuggestionIndex
                ? "#ffffff"
                : "#1f1f1f";
            row.addEventListener("mouseenter", () => {
                state.activeSuggestionIndex = index;
                renderSuggestions();
            });
            row.addEventListener("mousedown", (event) => {
                event.preventDefault();
                event.stopPropagation();
                applySuggestion(item);
            });
            suggestPopup.appendChild(row);
        });

        const cursor = state.editor.getScrolledVisiblePosition?.(context.position);
        const left = Math.max(0, Number(cursor?.left || 0) + 5);
        const top = Math.max(
            0,
            Number(cursor?.top || 0) + Number(cursor?.height || 18) + 5
        );

        suggestPopup.style.left = `${left}px`;
        suggestPopup.style.top = `${top}px`;
        suggestPopup.style.display = "block";
    };

    const moveSuggestionSelection = function(direction: number): void {
        if (!state.suggestions.length) {
            return;
        }

        state.activeSuggestionIndex = (
            state.activeSuggestionIndex
            + direction
            + state.suggestions.length
        ) % state.suggestions.length;
        renderSuggestions();
    };

    const applyDisabledState = function(): void {
        const disabled = isEditorDisabled();

        editorHost.style.background = disabled
            ? "var(--input-disabled-background-color, #dedede)"
            : "#ffffff";
        editorHost.style.borderColor = "var(--input-border-color, #777777)";
        editorHost.style.pointerEvents = disabled ? "none" : "";
        editorHost.style.cursor = disabled ? "default" : "text";
        editorHost.style.color = disabled ? "#444444" : "#000000";
        disabledOverlay.style.display = disabled ? "" : "none";

        if (disabled) {
            hideSuggestions();
        }

        const editorNode = state.editor?.getDomNode?.();

        if (editorNode instanceof HTMLElement) {
            editorNode.style.opacity = disabled ? "0.72" : "1";
        }
    };

    const refresh = async function(): Promise<void> {
        const selected = runtimeApi.getSelected(datasetElement);
        const datasetName = String(
            Array.isArray(selected) ? selected[0] || "" : ""
        ).trim();

        if (datasetName) {
            const variables = await getDatasetVariablesForDialog(datasetName);

            state.variableNames = variables
                .map((item) => getVariableDisplayName(item))
                .filter(Boolean);
        } else {
            state.variableNames = [];
        }

        applyDisabledState();
        state.editor?.updateOptions?.({
            readOnly: isEditorDisabled()
        });
    };

    const requestSuggestions = function(): void {
        if (!state.editor) {
            return;
        }

        if (state.suggestTimer !== null) {
            window.clearTimeout(state.suggestTimer);
        }

        state.suggestTimer = window.setTimeout(() => {
            state.suggestTimer = null;
            renderSuggestions();
        }, 0);
    };

    const synchronizeRuntimeValue = function(): void {
        if (!state.editor || state.suppressRuntimeSync) {
            return;
        }

        const editorValue = String(state.editor.getValue() || "");
        const value = editorValue.replace(/\r?\n+/g, " ");

        state.suppressRuntimeSync = true;

        try {
            if (value !== editorValue) {
                const position = state.editor.getPosition();

                state.editor.setValue(value);

                if (position) {
                    state.editor.setPosition({
                        lineNumber: 1,
                        column: Math.max(
                            1,
                            Math.min(position.column, value.length + 1)
                        )
                    });
                }
            }

            textarea.value = value;
            runtimeApi.setValue?.(inputElement, value);
            runtimeApi.triggerChange?.(inputElement);
        } finally {
            state.suppressRuntimeSync = false;
        }

        const context = readSuggestionContext();

        if (!context || context.token.length < 1) {
            hideSuggestions();
            return;
        }

        requestSuggestions();
    };

    const registerEditorCommands = function(monaco: typeof Monaco): void {
        const editor = state.editor;

        if (!editor) {
            return;
        }

        editor.addCommand(monaco.KeyCode.Enter, () => {
            if (
                state.suggestions.length
                && state.activeSuggestionIndex >= 0
            ) {
                applySuggestion(state.suggestions[state.activeSuggestionIndex]);
                return;
            }

            if (editor.getOption(monaco.editor.EditorOption.readOnly)) {
                return;
            }

            const selection = editor.getSelection();

            if (!selection) {
                return;
            }

            editor.executeEdits("dialogr-select-expression-enter", [{
                range: selection,
                text: " ",
                forceMoveMarkers: true
            }]);
        });

        editor.addCommand(
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space,
            requestSuggestions
        );
        editor.addCommand(monaco.KeyCode.Tab, () => {
            if (
                state.suggestions.length
                && state.activeSuggestionIndex >= 0
            ) {
                applySuggestion(state.suggestions[state.activeSuggestionIndex]);
            }
        });
        editor.addCommand(monaco.KeyCode.DownArrow, () => {
            moveSuggestionSelection(1);
        });
        editor.addCommand(monaco.KeyCode.UpArrow, () => {
            moveSuggestionSelection(-1);
        });
        editor.addCommand(monaco.KeyCode.Escape, hideSuggestions);
    };

    const registerEditorEvents = function(): void {
        const editor = state.editor;

        if (!editor) {
            return;
        }

        state.changeDisposable = editor.onDidChangeModelContent(
            synchronizeRuntimeValue
        );
        state.cursorDisposable = editor.onDidChangeCursorPosition(() => {
            if (state.suggestions.length) {
                renderSuggestions();
            }
        });
        state.blurDisposable = editor.onDidBlurEditorText(() => {
            window.setTimeout(() => {
                if (
                    document.activeElement
                    && suggestPopup.contains(document.activeElement)
                ) {
                    return;
                }

                hideSuggestions();
            }, 0);
        });
    };

    const initializeEditor = async function(): Promise<void> {
        const monaco = await ensureConsoleSyntaxReady();

        if (!editorHost.isConnected) {
            return;
        }

        state.editor = monaco.editor.create(editorHost, {
            value: textarea.value || "",
            language: "r",
            theme: CONSOLE_THEME_NAME,
            automaticLayout: true,
            minimap: { enabled: false },
            lineNumbers: "off",
            glyphMargin: false,
            folding: false,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 0,
            overviewRulerLanes: 0,
            overviewRulerBorder: false,
            scrollBeyondLastLine: false,
            scrollbar: {
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10
            },
            wordWrap: "on",
            wrappingIndent: "same",
            renderLineHighlight: "none",
            padding: { top: 0, bottom: 0 },
            fontSize: 12,
            fontFamily: "inherit",
            tabSize: 2,
            insertSpaces: true,
            suggestOnTriggerCharacters: false,
            quickSuggestions: false,
            fixedOverflowWidgets: false,
            overflowWidgetsDomNode: editorHost,
            readOnly: isEditorDisabled()
        });

        applyDisabledState();
        registerEditorCommands(monaco as typeof Monaco);
        registerEditorEvents();
        await refresh();
    };

    const disposeSafely = function(disposable: Disposable | null): void {
        try {
            disposable?.dispose?.();
        } catch {
            // Monaco disposal is best-effort during dialog teardown.
        }
    };

    const destroy = function(): void {
        if (state.suggestTimer !== null) {
            window.clearTimeout(state.suggestTimer);
            state.suggestTimer = null;
        }

        disposeSafely(state.changeDisposable);
        disposeSafely(state.cursorDisposable);
        disposeSafely(state.blurDisposable);
        disposeSafely(state.editor);

        textarea.style.opacity = "";
        textarea.style.pointerEvents = "";
        textarea.removeAttribute("aria-hidden");
        editorHost.remove();
    };

    applyDisabledState();
    void initializeEditor();

    return {
        refresh,
        destroy
    };
};
