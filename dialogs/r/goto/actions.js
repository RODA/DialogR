let activeDataset = '';
let allColumns = [];

const asText = (value) => String(value == null ? '' : value).trim();
const currentMode = () => {
    const selected = getSelected(vc_choice);
    const mode = Array.isArray(selected) && selected.length ? asText(selected[0]).toLowerCase() : '';
    return mode === 'case' ? 'case' : 'variable';
};
const applyMode = () => {
    if (currentMode() === 'case') {
        enable(label1);
        enable(caseno);
        disable(search);
        disable(c_variables);
        clearError(caseno);
        return;
    }
    disable(label1);
    disable(caseno);
    enable(search);
    enable(c_variables);
    clearError(c_variables);
};
const fillVariableList = () => {
    const filter = asText(getValue(search)).toLowerCase();
    const previousSelection = getSelected(c_variables);
    const previousName = Array.isArray(previousSelection) && previousSelection.length ? asText(previousSelection[0]) : '';
    const next = !filter
        ? allColumns.slice()
        : allColumns.filter((name) => String(name).toLowerCase().includes(filter));
    clearContent(c_variables);
    setValue(c_variables, next);
    if (!next.length) {
        clearError(c_variables);
        return;
    }
    if (previousName && next.includes(previousName)) {
        setSelected(c_variables, [previousName]);
        return;
    }
    setSelected(c_variables, [next[0]]);
};
const initializeDialog = async () => {
    const state = await getDatasetEditorState();
    const context = await consumeGoToContext();
    activeDataset = asText((context && context.datasetName) || (state && state.datasetName));
    allColumns = activeDataset ? listColumns(activeDataset) : [];
    const mode = asText(context && context.mode).toLowerCase() === 'case' ? 'Case' : 'Variable';
    setSelected(vc_choice, [mode]);
    fillVariableList();
    applyMode();
    if (currentMode() === 'case') {
        setValue(caseno, '1');
    }
};

onChange(vc_choice, applyMode);
onChange(search, () => {
    clearError(c_variables);
    fillVariableList();
});

onClick(button1, async () => {
    if (currentMode() === 'case') {
        const raw = asText(getValue(caseno));
        const parsed = Math.round(Number(raw || 1));
        const caseNumber = Number.isFinite(parsed) ? Math.max(1, parsed) : 1;
        clearError(caseno);
        await gotoDatasetEditorCase(caseNumber);
        closeDialog();
        return;
    }

    const selected = getSelected(c_variables);
    const variableName = Array.isArray(selected) && selected.length ? asText(selected[0]) : '';
    if (!variableName) {
        addError(c_variables, 'No variable selected');
        return;
    }
    clearError(c_variables);
    await gotoDatasetEditorVariable(variableName);
    closeDialog();
});

void initializeDialog();
