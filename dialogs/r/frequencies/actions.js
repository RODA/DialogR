// Frequency table.
//
// The dialog builds a command like:
//
//   using(
//     ess,
//     wtable(B1_polintr)
//   )

let selected_dataset = '<dataset>';
let selected_variable = '<variable>';

// Set by the Weight cases and Split by dialogs, for this dataset.
let selected_weight = '';
let selected_split = [];


// ---------------------------------------------------------------- the command

const tableCall = () => {
  // Only the settings that differ from the R defaults are written out, so the
  // command stays as short as the user's choices allow.
  const args = [selected_variable];

  if (selected_weight) {
    args.push('wt = ' + selected_weight);
  }

  if (!isChecked(cb_values)) {
    args.push('values = FALSE');
  }

  if (!isChecked(cb_valid)) {
    args.push('valid = FALSE');
  }

  if (!isChecked(cb_observed)) {
    args.push('observed = FALSE');
  }

  if (isChecked(cb_vlabel)) {
    args.push('vlabel = TRUE');
  }

  return 'wtable(' + args.join(', ') + ')';
};

const splitByArgument = () => {
  if (selected_split.length === 0) return '';
  if (selected_split.length === 1) return 'split.by = ' + selected_split[0];

  return 'split.by = c(' + selected_split.join(', ') + ')';
};

const buildCommand = () => {
  if (selected_dataset === '<dataset>') return '';
  if (selected_variable === '<variable>') return '';

  return call('using', [
    getReference(c_datasets),
    tableCall(),
    splitByArgument()
  ]);
};

const showCommand = () => updateSyntax(buildCommand());


// ------------------------------------------------------------------- the data

const readSelections = () => {
  selected_dataset = getSelected(c_datasets)[0] || '<dataset>';
  selected_variable = getSelected(c_variables)[0] || '<variable>';
};

// Weighting and grouping belong to the dataset, not to this dialog, so they are
// read back from whichever dialog set them.
const readDatasetState = async () => {
  if (selected_dataset === '<dataset>') {
    selected_weight = '';
    selected_split = [];
    return;
  }

  const [split_state, weight_state] = await Promise.all([
    callExternal('getSplitByState', { dataset: selected_dataset }),
    callExternal('getWeightByState', { dataset: selected_dataset })
  ]);

  selected_split = split_state && Array.isArray(split_state.grouping) ? split_state.grouping : [];
  selected_weight = weight_state && typeof weight_state.weighting === 'string' ? weight_state.weighting : '';
};

enableSearch(c_variables);

callExternal('rememberVariableSelections', {
  source: c_datasets,
  dependents: [c_variables]
});

bindObjects({
  dialog: 'frequencies',
  datasets: c_datasets,
  variables: c_variables
});


// --------------------------------------------------------- user interactions

onChange(c_datasets, async () => {
  clearError(c_datasets);
  selected_dataset = getSelected(c_datasets)[0] || '<dataset>';

  if (selected_dataset === '<dataset>') {
    selected_variable = '<variable>';
    clearContent(c_variables);
    await readDatasetState();
    showCommand();
    return;
  }

  await readDatasetState();
  triggerChange(c_variables);
});

onChange(c_variables, () => {
  clearError(c_variables);
  selected_variable = getSelected(c_variables)[0] || '<variable>';
  showCommand();
});

onChange(cb_values, showCommand);
onChange(cb_valid, showCommand);
onChange(cb_observed, showCommand);
onChange(cb_vlabel, showCommand);

onClick(b_run, async () => {
  readSelections();

  if (selected_dataset === '<dataset>') {
    addError(c_datasets, 'No dataset selected');
    return;
  }

  if (selected_variable === '<variable>') {
    addError(c_variables, 'No variable selected');
    return;
  }

  await readDatasetState();
  run(buildCommand());
});

onClick(b_reset, () => {
  resetDialog();
  readSelections();
  showCommand();
});


// The dialog opens with whatever the host restored, or with its own defaults.
if (getSelected(c_datasets).length > 0) {
  triggerChange(c_datasets);
} else {
  showCommand();
}
