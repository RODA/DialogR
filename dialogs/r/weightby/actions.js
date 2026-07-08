let selected_dataset = '<dataset>';
let all_variables = [];
let weighting_variable = '';
let selection_sync_in_progress = false;
let last_selected_variables = [];

const variableName = (item) => {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object') {
    if (item.name != null) return String(item.name);
    if (item.text != null) return String(item.text);
    if (item.label != null) return String(item.label);
    if (item.value != null) return String(item.value);
  }
  return String(item || '');
};

const availableVariableNames = () => all_variables.map(variableName).filter(Boolean);

enableSearch(c_datasets, c_variables, c_weighting);
const objectBinding = bindObjects({
  dialog: 'weightby',
  datasets: c_datasets
});
if (getSelected(c_datasets).length > 0) {
  triggerChange(c_datasets);
}

const renderWeightingState = () => {
  const available_variables = all_variables.filter((item) => variableName(item) !== weighting_variable);
  selection_sync_in_progress = true;
  setValue(c_variables, available_variables);
  setValue(c_weighting, weighting_variable ? [weighting_variable] : []);
  setSelected(c_variables, []);
  setSelected(c_weighting, weighting_variable ? [weighting_variable] : []);
  selection_sync_in_progress = false;
  callExternal('setWeightByButtonDirection', {
    direction: weighting_variable ? 'left' : 'right'
  });
};

const persistWeightingState = async () => {
  const dataset = getSelected(c_datasets)[0] || '';
  if (!dataset) return;
  await callExternal('setWeightByState', {
    dataset,
    weighting: weighting_variable,
    datasets: listObjects('datasets')
  });
};

onChange(c_datasets, async () => {
  clearError(c_datasets);
  clearError(c_variables);
  clearError(c_weighting);
  selected_dataset = getSelected(c_datasets)[0] || '<dataset>';

  if (selected_dataset === '<dataset>') {
    all_variables = [];
    weighting_variable = '';
    clearContent(c_variables, c_weighting);
    callExternal('setWeightByButtonDirection', { direction: 'right' });
    return;
  }

  all_variables = await callExternal('getDatasetVariablesForDialog', { dataset: selected_dataset });
  const published = await callExternal('getWeightByState', { dataset: selected_dataset });
  const names = availableVariableNames();
  weighting_variable = published && typeof published.weighting === 'string' && names.includes(published.weighting)
    ? published.weighting
    : '';
  renderWeightingState();
});

onChange(c_variables, () => {
  clearError(c_variables);
  if (selection_sync_in_progress) return;
  last_selected_variables = getSelected(c_variables);
  selection_sync_in_progress = true;
  setSelected(c_weighting, []);
  selection_sync_in_progress = false;
  callExternal('setWeightByButtonDirection', { direction: 'right' });
});

onChange(c_weighting, () => {
  clearError(c_weighting);
  if (selection_sync_in_progress) return;
  selection_sync_in_progress = true;
  setSelected(c_variables, []);
  selection_sync_in_progress = false;
  callExternal('setWeightByButtonDirection', {
    direction: getSelected(c_weighting).length > 0 ? 'left' : 'right'
  });
});

onClick(addremove, async () => {
  const dataset = getSelected(c_datasets)[0] || '';
  if (!dataset) return;

  const selected_weighting = getSelected(c_weighting);
  if (selected_weighting.length > 0) {
    weighting_variable = '';
  } else {
    const selected_variables = getSelected(c_variables);
    const variables_to_add = selected_variables.length > 0
      ? selected_variables
      : last_selected_variables;
    if (variables_to_add.length === 0) return;
    weighting_variable = variables_to_add[variables_to_add.length - 1];
  }

  renderWeightingState();
  await persistWeightingState();
});

onClick(b_run, async () => {
  const dataset = getSelected(c_datasets)[0] || '';
  if (dataset) {
    await persistWeightingState();
  }
  closeDialog();
});

onClick(b_reset, async () => {
  const dataset = getSelected(c_datasets)[0] || (selected_dataset === '<dataset>' ? '' : selected_dataset);
  resetDialog();
  selected_dataset = '<dataset>';
  all_variables = [];
  weighting_variable = '';
  if (dataset) {
    await callExternal('clearWeightByState', {
      dataset,
      datasets: listObjects('datasets')
    });
  }
  objectBinding.refresh();
  if (getSelected(c_datasets).length > 0) {
    triggerChange(c_datasets);
    return;
  }
  clearContent(c_variables, c_weighting);
  callExternal('setWeightByButtonDirection', { direction: 'right' });
});

(async () => {
  if (selected_dataset === '<dataset>') {
    if (getSelected(c_datasets).length > 0) {
      triggerChange(c_datasets);
      return;
    }
    clearContent(c_variables, c_weighting);
    callExternal('setWeightByButtonDirection', { direction: 'right' });
    return;
  }

  setSelected(c_datasets, [selected_dataset]);
  all_variables = await callExternal('getDatasetVariablesForDialog', { dataset: selected_dataset });
  const published = await callExternal('getWeightByState', { dataset: selected_dataset });
  const names = availableVariableNames();
  weighting_variable = published && typeof published.weighting === 'string' && names.includes(published.weighting)
    ? published.weighting
    : '';
  renderWeightingState();
})();
