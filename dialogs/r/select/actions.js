let selected_dataset = '<dataset>';
let all_variables = [];
let selection_sync_in_progress = false;

const selectedVariables = () => getSelected(c_variables);
const selectedRowMode = () => {
  if (isChecked(rd_new)) return 'new';
  if (isChecked(rd_filter)) return 'filter';
  if (isChecked(rd_delete)) return 'delete';
  return 'allcases';
};
const usesSubsetExpression = () => selectedRowMode() !== 'allcases';
const targetDatasetName = () => String(getValue(newname) || '').trim();
const subsetExpression = () => String(getValue(expression) || '').replace(/\r?\n+/g, ' ').trim();
const usesAllVariables = () => isChecked(cb_allvars);
const selectedDatasetName = () => getSelected(c_datasets)[0] || '<dataset>';
const datasetsList = () => listObjects('datasets');

const syncVariableState = () => {
  clearError(c_variables);
  if (usesAllVariables()) {
    disable(c_variables);
    return;
  }
  enable(c_variables);
};

const syncModeState = () => {
  const newMode = selectedRowMode() === 'new';
  show(label15);
  if (newMode) {
    show(newname);
    enable(newname);
  } else {
    hide(newname);
    disable(newname);
    clearError(newname);
  }

  if (usesSubsetExpression()) {
    enable(expression);
  } else {
    disable(expression);
    clearError(expression);
  }
};

const buildSubsetCall = () => {
  const dataset = selectedDatasetName();
  if (dataset === '<dataset>') return '';

  const expr = subsetExpression();
  const variables = usesAllVariables() ? [] : selectedVariables();
  const hasSubset = usesSubsetExpression() && expr.length > 0;
  const hasSelect = !usesAllVariables() && variables.length > 0;
  if (!hasSubset && !hasSelect) return '';

  const args = [dataset];
  if (hasSubset) args.push(expr);
  if (hasSelect) args.push('select = c(' + variables.join(', ') + ')');
  return 'subset(\n  ' + args.join(',\n  ') + '\n)';
};

const buildDisplayCommand = () => {
  const mode = selectedRowMode();
  const subsetCall = buildSubsetCall();
  if (!subsetCall) return '';

  if (mode === 'new') {
    const target = targetDatasetName();
    if (!target) return '';
    return target + ' <- ' + subsetCall + '\n';
  }
  if (mode === 'delete') {
    return selectedDatasetName() + ' <- ' + subsetCall + '\n';
  }
  if (mode === 'filter') {
    return subsetCall + '\n';
  }
  return '';
};

const buildExecutionCommand = () => {
  const mode = selectedRowMode();
  const subsetCall = buildSubsetCall();
  if (!subsetCall) return '';

  if (mode === 'new') {
    const target = targetDatasetName();
    if (!target) return '';
    return target + ' <- ' + subsetCall + '\n';
  }
  if (mode === 'delete') {
    return selectedDatasetName() + ' <- ' + subsetCall + '\n';
  }
  return '';
};

const refreshSyntax = () => {
  syncModeState();
  syncVariableState();
  updateSyntax(buildDisplayCommand());
  void callExternal('refreshSelectExpressionMonaco');
};

callExternal('rememberVariableSelections', {
  source: c_datasets,
  dependents: [c_variables]
});
enableSearch(c_datasets, c_variables);
const objectBinding = bindObjects({
  dialog: 'select',
  datasets: c_datasets
});
disable(expression);
callExternal('bindSelectExpressionMonaco', {
  input: 'expression',
  dataset: 'c_datasets'
});
hide(newname);
show(label15);
disable(newname);

onChange(c_datasets, async () => {
  clearError(c_datasets);
  clearError(c_variables);
  selected_dataset = selectedDatasetName();

  if (selected_dataset === '<dataset>') {
    all_variables = [];
    clearContent(c_variables);
    await callExternal('refreshSelectExpressionMonaco');
    refreshSyntax();
    return;
  }

  all_variables = await callExternal('getDatasetVariablesForDialog', { dataset: selected_dataset });
  setValue(c_variables, all_variables);
  await callExternal('refreshSelectExpressionMonaco');
  refreshSyntax();
});

onChange(c_variables, () => {
  clearError(c_variables);
  if (selection_sync_in_progress) return;
  refreshSyntax();
});

onChange(cb_allvars, () => {
  refreshSyntax();
});

onChange(radiogroup1, () => {
  clearError(expression);
  clearError(newname);
  refreshSyntax();
});

onChange(expression, () => {
  clearError(expression);
  refreshSyntax();
});

onChange(newname, () => {
  clearError(newname);
  refreshSyntax();
});

onClick(b_run, async () => {
  const dataset = selectedDatasetName();
  const mode = selectedRowMode();
  const variables = usesAllVariables() ? [] : selectedVariables();
  const subsetCall = buildSubsetCall();
  const command = buildExecutionCommand();

  if (dataset === '<dataset>') {
    addError(c_datasets, 'No dataset selected');
    return;
  }

  if (!usesAllVariables() && variables.length === 0) {
    addError(c_variables, 'No variable selected');
    return;
  }

  if (mode === 'new' && subsetCall && !targetDatasetName()) {
    addError(newname, 'New dataset needs a name');
    return;
  }

  if (mode === 'filter') {
    if (subsetCall) {
      await callExternal('setFilterState', { dataset, command: subsetCall, datasets: datasetsList() });
    } else {
      await callExternal('clearFilterState', { dataset, datasets: datasetsList() });
    }
    closeDialog();
    return;
  }

  if (mode === 'allcases') {
    await callExternal('clearFilterState', { dataset, datasets: datasetsList() });
    closeDialog();
    return;
  }

  if (!command) {
    closeDialog();
    return;
  }

  const targetDataset = mode === 'new' ? targetDatasetName() : dataset;
  const result = await run(command);
  if (result && result.ok) {
    if (mode === 'new') {
      await callExternal('inheritSubsetDatasetState', {
        source: dataset,
        target: targetDataset,
        variables: variables.length > 0 ? variables : all_variables,
        datasets: datasetsList().concat(targetDataset)
      });
    }
    if (mode === 'delete') {
      await callExternal('clearFilterState', { dataset, datasets: datasetsList() });
    }
    await callExternal('refreshDatasetEditor', { datasetName: targetDataset });
  }
});

onClick(b_reset, async () => {
  resetDialog();
  selected_dataset = '<dataset>';
  all_variables = [];
  objectBinding.refresh();
  hide(newname);
  show(label15);
  disable(newname);
  clearContent(c_variables);
  await callExternal('refreshSelectExpressionMonaco');
  refreshSyntax();
  if (getSelected(c_datasets).length > 0) triggerChange(c_datasets);
});

if (getSelected(c_datasets).length > 0) {
  triggerChange(c_datasets);
} else {
  void callExternal('refreshSelectExpressionMonaco');
  refreshSyntax();
}
