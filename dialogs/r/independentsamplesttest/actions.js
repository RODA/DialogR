let selected_dataset = '<dataset>';
let selected_dataset_expression = '<dataset>';
let selected_testvar = '<variable>';
let selected_groupvar = '<variable>';

enableSearch(c_testvar);
enableSearch(c_groupvar);

callExternal('rememberVariableSelections', {
  source: c_datasets,
  dependents: [c_testvar, c_groupvar]
});
bindObjects({
  dialog: 'independentsamplesttest',
  datasets: c_datasets
});

const indentNestedExpression = (value) => {
  const lines = String(value || '').split('\n');
  if (lines.length <= 1) return String(value || '');
  return lines.map((line, index) => index === 0 ? line : '  ' + line).join('\n');
};

const datasetReference = () => selected_dataset_expression && selected_dataset_expression !== '<dataset>'
  ? indentNestedExpression(selected_dataset_expression)
  : selected_dataset;

const selectedAlternative = () => {
  if (isChecked(r_left)) return 'less';
  if (isChecked(r_right)) return 'greater';
  return 'two.sided';
};

const selectedVarEqual = () => {
  if (isChecked(checkbox1)) return 'NULL';
  if (isChecked(r_yes)) return 'TRUE';
  return 'FALSE';
};

const refreshFilter = async () => {
  if (selected_dataset === '<dataset>') {
    selected_dataset_expression = '<dataset>';
    return;
  }
  const filter_state = await callExternal('getFilterState', { dataset: selected_dataset });
  selected_dataset_expression = filter_state && typeof filter_state.command === 'string' && filter_state.command
    ? filter_state.command
    : selected_dataset;
};

const buildCommand = () => {
  if (selected_dataset === '<dataset>' || selected_testvar === '<variable>' || selected_groupvar === '<variable>') {
    return '';
  }

  const confidence_percent = String(getValue(input1) || '95').trim() || '95';
  const confidence_level = Number(confidence_percent) / 100;
  const args = [];

  const alternative = selectedAlternative();
  if (alternative !== 'two.sided') {
    args.push('alternative = ' + JSON.stringify(alternative));
  }

  const var_equal = selectedVarEqual();
  if (var_equal !== 'NULL') {
    args.push('var.equal = ' + var_equal);
  }

  if (confidence_level !== 0.95) {
    args.push('conf.level = ' + confidence_level);
  }

  const arg_string = args.length ? ', ' + args.join(', ') : '';

  return 'with(\n  ' + datasetReference() + ',\n  t.testhv(' + selected_testvar + ' ~ ' + selected_groupvar + arg_string + ')\n)\n';
};

const updatePreview = () => {
  const use_homog_test = isChecked(checkbox1);
  if (use_homog_test) {
    disable(r_yes);
    disable(r_no);
  } else {
    enable(r_yes);
    enable(r_no);
  }
  updateSyntax(buildCommand());
};

onChange(c_datasets, async () => {
  clearError(c_datasets);
  selected_dataset = getSelected(c_datasets)[0] || '<dataset>';

  if (selected_dataset === '<dataset>') {
    selected_dataset_expression = '<dataset>';
    selected_testvar = '<variable>';
    selected_groupvar = '<variable>';
    clearContent(c_testvar);
    clearContent(c_groupvar);
    updatePreview();
    return;
  }

  const variables = await callExternal('getDatasetVariablesForDialog', { dataset: selected_dataset });
  setValue(c_testvar, variables);
  setValue(c_groupvar, variables);
  await refreshFilter();
  triggerChange(c_testvar);
  triggerChange(c_groupvar);
});

onChange(c_testvar, () => {
  clearError(c_testvar);
  selected_testvar = getSelected(c_testvar)[0] || '<variable>';
  updatePreview();
});

onChange(c_groupvar, () => {
  clearError(c_groupvar);
  selected_groupvar = getSelected(c_groupvar)[0] || '<variable>';
  updatePreview();
});

onChange(input1, () => {
  clearError(input1);
  updatePreview();
});

onChange(alternative, () => {
  updatePreview();
});

onChange(varequal, () => {
  updatePreview();
});

onChange(checkbox1, () => {
  updatePreview();
});

onClick(b_run, async () => {
  selected_dataset = getSelected(c_datasets)[0] || '<dataset>';
  selected_testvar = getSelected(c_testvar)[0] || '<variable>';
  selected_groupvar = getSelected(c_groupvar)[0] || '<variable>';

  if (selected_dataset === '<dataset>') {
    addError(c_datasets, 'No dataset selected');
    return;
  }

  if (selected_testvar === '<variable>') {
    addError(c_testvar, 'No test variable selected');
    return;
  }

  if (selected_groupvar === '<variable>') {
    addError(c_groupvar, 'No group variable selected');
    return;
  }

  await refreshFilter();
  run(buildCommand());
});

onClick(b_reset, () => {
  resetDialog();
  selected_dataset = getSelected(c_datasets)[0] || '<dataset>';
  selected_testvar = getSelected(c_testvar)[0] || '<variable>';
  selected_groupvar = getSelected(c_groupvar)[0] || '<variable>';
  setValue(input1, '95');
  check(r_twosided);
  check(checkbox1);
  check(r_no);
  updatePreview();
});

if (getSelected(c_datasets).length > 0) {
  triggerChange(c_datasets);
} else if (getSelected(c_testvar).length > 0) {
  triggerChange(c_testvar);
} else if (getSelected(c_groupvar).length > 0) {
  triggerChange(c_groupvar);
} else {
  setValue(input1, '95');
  check(r_twosided);
  check(checkbox1);
  check(r_no);
  updatePreview();
}
