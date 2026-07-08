let selected_dataset = '<dataset>';
let selected_dataset_expression = '<dataset>';
let selected_rows = '<row>';
let selected_cols = '<col>';
let selected_weight = '';
let selected_split = [];
let want_proportions = isChecked(cb_proportions);

const indentNestedExpression = (value) => {
  const lines = String(value || '').split('\n');
  if (lines.length <= 1) return String(value || '');
  return lines.map((line, index) => index === 0 ? line : '  ' + line).join('\n');
};

const datasetReference = () => selected_dataset_expression && selected_dataset_expression !== '<dataset>'
  ? indentNestedExpression(selected_dataset_expression)
  : selected_dataset;

// Keep row/column selections when dataset changes
callExternal('rememberVariableSelections', {
  source: c_datasets,
  dependents: [c_rows, c_cols]
});

// Make lists searchable
enableSearch(c_datasets, c_rows, c_cols);
// Bind object updates to keep dataset/variables in sync
bindObjects({
  dialog: 'crosstable',
  datasets: c_datasets,
  variables: {
    rows: c_rows,
    columns: c_cols
  }
});

// Proportions label should be enabled in this dialog
enable(label_proportions);

const syncProportionsUI = () => {
  if (isChecked(cb_proportions)) {
    setValue(select1, getValue(select1) || 'Total');
    enable(select1);
  } else {
    setValue(select1, 'Total');
    disable(select1);
  }
};

syncProportionsUI();

onChange(cb_proportions, () => { syncProportionsUI(); });

onClick(b_reset, () => { syncProportionsUI(); });

const buildCommand = () => {
  if (selected_dataset === '<dataset>') return '';
  const rows = Array.isArray(selected_rows) ? selected_rows : [];
  const cols = Array.isArray(selected_cols) ? selected_cols : [];
  if (rows.length === 0 || cols.length === 0) return '';
  const X = rows[0];
  const Y = cols[0];

  let split_by_argument = '';
  if (Array.isArray(selected_split)) {
    if (selected_split.length === 1) {
      split_by_argument = 'split.by = ' + selected_split[0];
    } else if (selected_split.length > 1) {
      split_by_argument = 'split.by = c(' + selected_split.join(', ') + ')';
    }
  }

  let tableCall = 'wtable(' + X + ', ' + Y;
  if (selected_weight) {
    tableCall += ', wt = ' + selected_weight;
  }
  tableCall += ')';

  let analysis = tableCall;
  const want_chisq = isChecked(cb_chisq);
  const want_fischer = isChecked(cb_fischer);
  if (want_proportions || want_chisq || want_fischer) {
    analysis = '{\n    .table <- ' + tableCall + '\n    print(.table)';
    if (want_proportions) {
      const prop_select = getValue(select1) || 'Total';
      let propsCall = 'proportions(.table';
      if (prop_select !== 'Total') {
        propsCall += ', margin = ' + (prop_select === 'Rows' ? 1 : 2);
      }
      propsCall += ')';
      analysis += '\n    ' + propsCall;
    }
    if (want_chisq) {
      analysis += '\n    chisq.test(.table)';
    }
    if (want_fischer) {
      analysis += '\n    fischer.exact(.table)';
    }
    analysis += '\n  }';
  }

  let command = 'using(\n  ' + datasetReference() + ',\n  ' + analysis;
  if (split_by_argument) {
    command += ',\n  ' + split_by_argument;
  }
  command += '\n)\n';
  return command;
};

// Handlers
onChange(c_datasets, async () => {
  clearError(c_datasets);
  selected_dataset = getSelected(c_datasets)[0] || '<dataset>' ;

  if (selected_dataset === '<dataset>') {
    clearContent(c_rows, c_cols);
    selected_rows = ['<row>'];
    selected_cols = ['<col>'];
    selected_split = [];
    selected_weight = '';
    selected_dataset_expression = '<dataset>';
    updateSyntax(buildCommand());
    return;
  }

  const [split_state, weight_state, filter_state] = await Promise.all([
    callExternal('getSplitByState', { dataset: selected_dataset }),
    callExternal('getWeightByState', { dataset: selected_dataset }),
    callExternal('getFilterState', { dataset: selected_dataset })
  ]);
  selected_split = split_state && Array.isArray(split_state.grouping) ? split_state.grouping : [];
  selected_weight = weight_state && typeof weight_state.weighting === 'string' ? weight_state.weighting : '';
  selected_dataset_expression =
    filter_state && typeof filter_state.command === 'string' && filter_state.command
      ? filter_state.command
      : selected_dataset;

  updateSyntax(buildCommand());
});

onChange(c_rows, () => {
  clearError(c_rows);
  const picked = getSelected(c_rows);
  if (picked.length > 1) {
    const first = picked[0];
    setSelected(c_rows, [first]);
    selected_rows = [first];
  } else {
    selected_rows = picked;
  }
  updateSyntax(buildCommand());
});

onChange(c_cols, () => {
  clearError(c_cols);
  const picked = getSelected(c_cols);
  if (picked.length > 1) {
    const first = picked[0];
    setSelected(c_cols, [first]);
    selected_cols = [first];
  } else {
    selected_cols = picked;
  }
  updateSyntax(buildCommand());
});

onChange(cb_proportions, () => {
  want_proportions = isChecked(cb_proportions);
  updateSyntax(buildCommand());
});

onChange(select1, () => {
  updateSyntax(buildCommand());
});

onChange(cb_chisq, () => {
  updateSyntax(buildCommand());
});

onChange(cb_fischer, () => {
  updateSyntax(buildCommand());
});

onClick(b_run, async () => {
  selected_dataset = getSelected(c_datasets)[0] || '<dataset>';
  selected_rows = getSelected(c_rows);
  selected_cols = getSelected(c_cols);

  if (selected_dataset === '<dataset>') {
    addError(c_datasets, 'No dataset selected');
    return;
  }
  if (!Array.isArray(selected_rows) || selected_rows.length === 0) {
    addError(c_rows, 'No variable(s) selected');
    return;
  }
  if (!Array.isArray(selected_cols) || selected_cols.length === 0) {
    addError(c_cols, 'No variable(s) selected');
    return;
  }

  const [split_state, weight_state, filter_state] = await Promise.all([
    callExternal('getSplitByState', { dataset: selected_dataset }),
    callExternal('getWeightByState', { dataset: selected_dataset }),
    callExternal('getFilterState', { dataset: selected_dataset })
  ]);
  selected_split = split_state && Array.isArray(split_state.grouping) ? split_state.grouping : [];
  selected_weight = weight_state && typeof weight_state.weighting === 'string' ? weight_state.weighting : '';
  selected_dataset_expression =
    filter_state && typeof filter_state.command === 'string' && filter_state.command
      ? filter_state.command
      : selected_dataset;

  const command = buildCommand();
  if (!command) return;
  run(command);
});

onClick(b_reset, () => {
  resetDialog();
  selected_dataset = '<dataset>';
  selected_dataset_expression = '<dataset>';
  selected_rows = ['<row>'];
  selected_cols = ['<col>'];
  selected_split = [];
  selected_weight = '';
  want_proportions = isChecked(cb_proportions);
  bindObjects({
    dialog: 'crosstable',
    datasets: c_datasets,
    variables: {
      rows: c_rows,
      columns: c_cols
    }
  }).refresh();
  clearContent(c_rows, c_cols);
  updateSyntax(buildCommand());
  if (getSelected(c_datasets).length > 0) triggerChange(c_datasets);
});

if (getSelected(c_datasets).length > 0) {
  triggerChange(c_datasets);
} else if (getSelected(c_rows).length > 0 || getSelected(c_cols).length > 0) {
  triggerChange(c_rows);
  triggerChange(c_cols);
} else {
  updateSyntax(buildCommand());
}
