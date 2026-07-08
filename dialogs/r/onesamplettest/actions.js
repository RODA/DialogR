let selected_dataset = '<dataset>';
let selected_dataset_expression = '<dataset>';
let selected_variable = '<variable>';

setValue(mulabel, 'μ =');
setValue(mu, '0');
setValue(cl, '95');
check(r_neq);
enableSearch(c_variables);

callExternal('rememberVariableSelections', {
  source: c_datasets,
  dependents: [c_variables]
});
bindObjects({
  dialog: 'onesamplettest',
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

const updateAlternativeLabels = () => {
  const muvalue = String(getValue(mu) || '0').trim() || '0';
  setValue(neqlabel, 'μ ≠ ' + muvalue);
  setValue(gtlabel, 'μ > ' + muvalue);
  setValue(ltlabel, 'μ < ' + muvalue);
};

const selectedAlternative = () => {
  if (isChecked(r_gt)) return 'greater';
  if (isChecked(r_lt)) return 'less';
  return 'two.sided';
};

const buildCommand = () => {
  if (selected_dataset === '<dataset>' || selected_variable === '<variable>') {
    return '';
  }

  const muvalue = String(getValue(mu) || '0').trim() || '0';
  const confidence_percent = String(getValue(cl) || '95').trim() || '95';
  const confidence_level = Number(confidence_percent) / 100;

  return 'using(\n  ' + datasetReference() + ',\n  t.test(' + selected_variable + ', alternative = ' + JSON.stringify(selectedAlternative()) + ', mu = ' + muvalue + ', conf.level = ' + confidence_level + ')\n)\n';
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

const updatePreview = () => {
  updateAlternativeLabels();
  updateSyntax(buildCommand());
};

onChange(c_datasets, async () => {
  clearError(c_datasets);
  selected_dataset = getSelected(c_datasets)[0] || '<dataset>';
  if (selected_dataset === '<dataset>') {
    selected_dataset_expression = '<dataset>';
    selected_variable = '<variable>';
    clearContent(c_variables);
    updatePreview();
    return;
  }

  setValue(c_variables, await callExternal('getDatasetVariablesForDialog', { dataset: selected_dataset }));
  await refreshFilter();
  triggerChange(c_variables);
});

onChange(c_variables, () => {
  clearError(c_variables);
  selected_variable = getSelected(c_variables)[0] || '<variable>';
  updatePreview();
});

onChange(radiogroup1, () => {
  updatePreview();
});

onChange(mu, () => {
  clearError(mu);
  updatePreview();
});

onChange(cl, () => {
  clearError(cl);
  updatePreview();
});

onClick(b_run, async () => {
  selected_dataset = getSelected(c_datasets)[0] || '<dataset>';
  selected_variable = getSelected(c_variables)[0] || '<variable>';

  if (selected_dataset === '<dataset>') {
    addError(c_datasets, 'No dataset selected');
    return;
  }

  if (selected_variable === '<variable>') {
    addError(c_variables, 'No variable selected');
    return;
  }

  await refreshFilter();
  run(buildCommand());
});

onClick(b_reset, () => {
  resetDialog();
  selected_dataset = getSelected(c_datasets)[0] || '<dataset>';
  selected_variable = getSelected(c_variables)[0] || '<variable>';
  setValue(mu, '0');
  setValue(cl, '95');
  check(r_neq);
  updatePreview();
});

if (getSelected(c_datasets).length > 0) {
  triggerChange(c_datasets);
} else if (getSelected(c_variables).length > 0) {
  triggerChange(c_variables);
} else {
  updatePreview();
}
