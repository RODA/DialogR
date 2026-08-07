// Go to a variable or a case in the dataset editor.
//
// This dialog runs no command. It asks the host to move the dataset editor,
// which is a host feature rather than part of the scripting API, so every
// step goes through callExternal().

let active_dataset = '';
let all_variables = [];


// --------------------------------------------------------------- the two modes

const goingToCase = () => getSelected(vc_choice)[0] === 'Case';

const showMode = () => {
  // Each mode enables its own half of the dialog.
  enable(label1, goingToCase());
  enable(caseno, goingToCase());
  enable(search, !goingToCase());
  enable(c_variables, !goingToCase());

  clearError(goingToCase() ? c_variables : caseno);
};

// The search box narrows the list, keeping the current choice when it survives.
const showVariables = () => {
  const filter = String(getValue(search) || '').trim().toLowerCase();
  const previous = getSelected(c_variables)[0] || '';

  const matching = filter
    ? all_variables.filter((name) => String(name).toLowerCase().includes(filter))
    : all_variables.slice();

  clearContent(c_variables);
  setValue(c_variables, matching);

  if (matching.length === 0) {
    clearError(c_variables);
    return;
  }

  setSelected(c_variables, [matching.includes(previous) ? previous : matching[0]]);
};


// ------------------------------------------------------------------- the data

const openDialog = async () => {
  const [state, context] = await Promise.all([
    callExternal('getDatasetEditorState'),
    callExternal('consumeGoToContext')
  ]);

  // The editor says which dataset is open, and may ask for a specific mode.
  active_dataset = String(
    (context && context.datasetName) || (state && state.datasetName) || ''
  ).trim();

  all_variables = active_dataset ? listColumns(active_dataset) : [];

  const wanted = String((context && context.mode) || '').toLowerCase();
  setSelected(vc_choice, [wanted === 'case' ? 'Case' : 'Variable']);

  showVariables();
  showMode();

  if (goingToCase()) {
    setValue(caseno, '1');
  }
};


// --------------------------------------------------------- user interactions

onChange(vc_choice, showMode);

onChange(search, () => {
  clearError(c_variables);
  showVariables();
});

onClick(button1, async () => {
  if (goingToCase()) {
    const wanted = Math.round(Number(getValue(caseno) || 1));
    const caseNumber = Number.isFinite(wanted) ? Math.max(1, wanted) : 1;

    clearError(caseno);
    await callExternal('gotoDatasetEditorCase', { caseNumber: caseNumber });
    closeDialog();
    return;
  }

  const variableName = getSelected(c_variables)[0] || '';

  if (!variableName) {
    addError(c_variables, 'No variable selected');
    return;
  }

  clearError(c_variables);
  await callExternal('gotoDatasetEditorVariable', { variableName: variableName });
  closeDialog();
});


void openDialog();
