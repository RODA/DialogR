// Contingency table.
//
// The dialog builds a command like:
//
//   using(
//     ess,
//     wtable(B1_polintr, F2_gndr)
//   )
//
// and, when proportions or tests are asked for, a block that reuses the table:
//
//   using(
//     ess,
//     {
//       .table <- wtable(B1_polintr, F2_gndr)
//       print(.table)
//       chisq.test(.table)
//     }
//   )

let selected_dataset = '<dataset>';
let selected_rows = '<row>';
let selected_cols = '<col>';

// Set by the Weight cases and Split by dialogs, for this dataset.
let selected_weight = '';
let selected_split = [];


// ---------------------------------------------------------------- the command

const tableCall = () => {
  const args = [selected_rows, selected_cols];

  if (selected_weight) {
    args.push('wt = ' + selected_weight);
  }

  return 'wtable(' + args.join(', ') + ')';
};

const splitByArgument = () => {
  if (selected_split.length === 0) return '';
  if (selected_split.length === 1) return 'split.by = ' + selected_split[0];

  return 'split.by = c(' + selected_split.join(', ') + ')';
};

const proportionsCall = () => {
  const margin = getValue(select1) || 'Total';

  if (margin === 'Total') {
    return 'proportions(.table)';
  }

  return 'proportions(.table, margin = ' + (margin === 'Rows' ? 1 : 2) + ')';
};

// A plain table is a single call. Asking for proportions or a test means the
// table has to be kept in .table so every step works on the same one.
const analysis = () => {
  const wants_proportions = isChecked(cb_proportions);
  const wants_chisq = isChecked(cb_chisq);
  const wants_fischer = isChecked(cb_fischer);

  if (!wants_proportions && !wants_chisq && !wants_fischer) {
    return tableCall();
  }

  return block([
    '.table <- ' + tableCall(),
    'print(.table)',
    wants_proportions ? proportionsCall() : '',
    wants_chisq ? 'chisq.test(.table)' : '',
    wants_fischer ? 'fischer.exact(.table)' : ''
  ]);
};

const buildCommand = () => {
  if (selected_dataset === '<dataset>') return '';
  if (selected_rows === '<row>') return '';
  if (selected_cols === '<col>') return '';

  return call('using', [
    getReference(c_datasets),
    analysis(),
    splitByArgument()
  ]);
};

const showCommand = () => {
  // The margin only applies when proportions were asked for.
  if (isChecked(cb_proportions)) {
    setValue(select1, getValue(select1) || 'Total');
    enable(select1);
  } else {
    setValue(select1, 'Total');
    disable(select1);
  }

  updateSyntax(buildCommand());
};


// ------------------------------------------------------------------- the data

const readSelections = () => {
  selected_dataset = getSelected(c_datasets)[0] || '<dataset>';
  selected_rows = getSelected(c_rows)[0] || '<row>';
  selected_cols = getSelected(c_cols)[0] || '<col>';
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

enableSearch(c_datasets, c_rows, c_cols);

callExternal('rememberVariableSelections', {
  source: c_datasets,
  dependents: [c_rows, c_cols]
});

const objectBinding = bindObjects({
  dialog: 'crosstable',
  datasets: c_datasets,
  variables: {
    rows: c_rows,
    columns: c_cols
  }
});

enable(label_proportions);


// --------------------------------------------------------- user interactions

onChange(c_datasets, async () => {
  clearError(c_datasets);
  selected_dataset = getSelected(c_datasets)[0] || '<dataset>';

  if (selected_dataset === '<dataset>') {
    selected_rows = '<row>';
    selected_cols = '<col>';
    clearContent(c_rows, c_cols);
    await readDatasetState();
    showCommand();
    return;
  }

  await readDatasetState();

  // The host refills the two variable lists and may restore a previous choice.
  triggerChange(c_rows);
  triggerChange(c_cols);
});

// Rows and columns take one variable each, so an extra click replaces it.
const keepSingleSelection = (container) => {
  const picked = getSelected(container);

  if (picked.length > 1) {
    setSelected(container, [picked[0]]);
  }

  return picked[0] || '';
};

onChange(c_rows, () => {
  clearError(c_rows);
  selected_rows = keepSingleSelection(c_rows) || '<row>';
  showCommand();
});

onChange(c_cols, () => {
  clearError(c_cols);
  selected_cols = keepSingleSelection(c_cols) || '<col>';
  showCommand();
});

onChange(cb_proportions, showCommand);
onChange(cb_chisq, showCommand);
onChange(cb_fischer, showCommand);
onChange(select1, showCommand);

onClick(b_run, async () => {
  readSelections();

  if (selected_dataset === '<dataset>') {
    addError(c_datasets, 'No dataset selected');
    return;
  }

  if (selected_rows === '<row>') {
    addError(c_rows, 'No variable(s) selected');
    return;
  }

  if (selected_cols === '<col>') {
    addError(c_cols, 'No variable(s) selected');
    return;
  }

  await readDatasetState();
  run(buildCommand());
});

onClick(b_reset, () => {
  resetDialog();
  selected_dataset = '<dataset>';
  selected_rows = '<row>';
  selected_cols = '<col>';
  selected_weight = '';
  selected_split = [];
  objectBinding.refresh();
  clearContent(c_rows, c_cols);
  showCommand();

  if (getSelected(c_datasets).length > 0) {
    triggerChange(c_datasets);
  }
});


// The dialog opens with whatever the host restored, or with its own defaults.
readSelections();

if (getSelected(c_datasets).length > 0) {
  triggerChange(c_datasets);
} else {
  showCommand();
}
