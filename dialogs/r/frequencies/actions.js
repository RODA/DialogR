let selected_dataset = '<dataset>';
let selected_dataset_expression = '<dataset>';
let selected_variables = ['<variable>'];
let selected_weight = '';
let selected_split = [];
let margin = 'Total';
let show_values = isChecked(cb_values);
let valid = isChecked(cb_valid);
let observed = isChecked(cb_observed);
let vlabel = isChecked(cb_vlabel);

const indentNestedExpression = (value) => {
  const lines = String(value || '').split('\n');
  if (lines.length <= 1) return String(value || '');
  return lines.map((line, index) => index === 0 ? line : '  ' + line).join('\n');
};

const datasetReference = () => selected_dataset_expression && selected_dataset_expression !== '<dataset>'
  ? indentNestedExpression(selected_dataset_expression)
  : selected_dataset;

enableSearch(c_variables);
setValue(select1, 'Total');
callExternal('rememberVariableSelections', {
  source: c_datasets,
  dependents: [c_variables]
});
bindObjects({
  dialog: 'frequencies',
  datasets: c_datasets,
  variables: c_variables
});

onChange(c_datasets, async () => {
  clearError(c_datasets);
  selected_dataset = getSelected(c_datasets)[0] || '<dataset>';
  if (selected_dataset === '<dataset>') {
    selected_dataset_expression = '<dataset>';
    selected_split = [];
    selected_weight = '';
    clearContent(c_variables);
    selected_variables = ['<variables>'];
    setValue(select1, 'Total');
    uncheck(cb_proportions);
    disable(cb_proportions);
    disable(label_proportions);
    disable(select1);
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
  selected_dataset_expression = filter_state && typeof filter_state.command === 'string' && filter_state.command
    ? filter_state.command
    : selected_dataset;
  triggerChange(c_variables);
});

onChange(c_variables, () => {
  clearError(c_variables);
  selected_variables = getSelected(c_variables);
  if (selected_variables.length == 0) {
    selected_variables = ['<variables>'];
  }
  if (selected_variables.length > 1 && selected_variables[0] !== '<variables>') {
    enable(cb_proportions);
    enable(label_proportions);
    if (!getValue(select1)) {
      setValue(select1, 'Total');
    }
  } else {
    setValue(select1, 'Total');
    uncheck(cb_proportions);
    disable(cb_proportions);
    disable(label_proportions);
    disable(select1);
  }
  if (selected_variables.length > 1 && isChecked(cb_proportions)) {
    enable(select1);
  }
  updateSyntax(buildCommand());
});

onChange(cb_values, () => {
  show_values = isChecked(cb_values);
  updateSyntax(buildCommand());
});

onChange(cb_valid, () => {
  valid = isChecked(cb_valid);
  updateSyntax(buildCommand());
});

onChange(cb_observed, () => {
  observed = isChecked(cb_observed);
  updateSyntax(buildCommand());
});

onChange(cb_vlabel, () => {
  vlabel = isChecked(cb_vlabel);
  updateSyntax(buildCommand());
});

onChange(cb_proportions, () => {
  if (isChecked(cb_proportions)) {
    setValue(select1, getValue(select1) || 'Total');
    enable(select1);
  } else {
    setValue(select1, 'Total');
    disable(select1);
  }
  updateSyntax(buildCommand());
});

onChange(select1, () => {
  margin = getValue(select1) || 'Total';
  updateSyntax(buildCommand());
});

const buildCommand = () => {
  let split_by_argument = '';
  let inner = 'wtable(' + selected_variables[0];
  let analysis = '';
  const prop_select = getValue(select1) || 'Total';

  if (selected_split.length === 1) {
    split_by_argument = 'split.by = ' + selected_split[0];
  } else if (selected_split.length > 1) {
    split_by_argument = 'split.by = c(' + selected_split.join(', ') + ')';
  }

  if (selected_variables.length > 1 ) {
    inner += ', ' + selected_variables[1];
  }
  if (selected_weight.length > 0) {
    inner += ', wt = ' + selected_weight;
  }
  if (!show_values) {
    inner += ', values = FALSE';
  }
  if (!valid) {
    inner += ', valid = FALSE';
  }
  if (!observed) {
    inner += ', observed = FALSE';
  }
  if (vlabel) {
    inner += ', vlabel = TRUE';
  }
  inner += ')';

  if (selected_variables.length > 1 && selected_variables[0] !== '<variables>' && isChecked(cb_proportions)) {
    analysis = 'proportions(\n    ' + inner;
    if (prop_select != 'Total') {
      analysis += ',\n    ' + (prop_select == 'Rows' ? 1 : 2);
    }
    analysis += '\n  )';
  } else {
    analysis = inner;
  }

  let command = 'using(\n  ' + datasetReference() + ',\n  ' + analysis;
  if (split_by_argument) {
    command += ',\n  ' + split_by_argument;
  }
  command += '\n)\n';
  return command;
}

onClick(b_run, async () => {
  selected_dataset = getSelected(c_datasets)[0] || '<dataset>';
  selected_variables = getSelected(c_variables);

  if (selected_dataset === '<dataset>') {
    addError(c_datasets, "No dataset selected");
    return;
  }

  if (selected_variables.length == 0) {
    selected_variables = ['<variables>'];
    addError(c_variables, "No variable(s) selected");
    return;
  }

  const [split_state, weight_state, filter_state] = await Promise.all([
    callExternal('getSplitByState', { dataset: selected_dataset }),
    callExternal('getWeightByState', { dataset: selected_dataset }),
    callExternal('getFilterState', { dataset: selected_dataset })
  ]);
  selected_split = split_state && Array.isArray(split_state.grouping) ? split_state.grouping : [];
  selected_weight = weight_state && typeof weight_state.weighting === 'string' ? weight_state.weighting : '';
  selected_dataset_expression = filter_state && typeof filter_state.command === 'string' && filter_state.command
    ? filter_state.command
    : selected_dataset;
  run(buildCommand());
});

onClick(b_reset, () => {
  resetDialog()
})

if (getSelected(c_datasets).length > 0) {
  triggerChange(c_datasets);
} else if (getSelected(c_variables).length > 0) {
  triggerChange(c_variables);
} else {
  setValue(select1, 'Total');
  disable(cb_proportions);
  disable(label_proportions);
  disable(select1);
  updateSyntax(buildCommand());
}
