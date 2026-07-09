let selected_dataset = '<dataset>';
let all_variables = [];
let grouping_variables = [];
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
const availableVariableEntries = () => all_variables.filter((item) => !grouping_variables.includes(variableName(item)));

enableSearch(c_datasets, c_variables, c_grouping);
const objectBinding = bindObjects({
  dialog: 'splitby',
  datasets: c_datasets
});
if (getSelected(c_datasets).length > 0) {
  triggerChange(c_datasets);
}

onChange(c_datasets, async () => {
  clearError(c_datasets);
  clearError(c_variables);
  clearError(c_grouping);
  selected_dataset = getSelected(c_datasets)[0] || '<dataset>';

  if (selected_dataset === '<dataset>') {
    all_variables = [];
    grouping_variables = [];
    clearContent(c_variables, c_grouping);
    uncheck(sortdataset);
    callExternal('setSplitByButtonDirection', { direction: 'right' });
    return;
  }

  all_variables = await callExternal('getDatasetVariablesForDialog', { dataset: selected_dataset });
  const published = await callExternal('getSplitByState', { dataset: selected_dataset });
  const names = availableVariableNames();
  grouping_variables = published && Array.isArray(published.grouping)
    ? published.grouping.filter((item) => names.includes(item))
    : [];

  setValue(c_variables, availableVariableEntries());
  setValue(c_grouping, grouping_variables);

  if (published && published.sortdataset) {
    check(sortdataset);
  } else {
    uncheck(sortdataset);
  }

  callExternal('setSplitByButtonDirection', { direction: 'right' });
});

onChange(c_variables, () => {
  clearError(c_variables);
  if (selection_sync_in_progress) return;
  last_selected_variables = getSelected(c_variables);
  selection_sync_in_progress = true;
  setSelected(c_grouping, []);
  selection_sync_in_progress = false;
  callExternal('setSplitByButtonDirection', { direction: 'right' });
});

onChange(c_grouping, () => {
  clearError(c_grouping);
  if (selection_sync_in_progress) return;
  selection_sync_in_progress = true;
  setSelected(c_variables, []);
  selection_sync_in_progress = false;
  callExternal('setSplitByButtonDirection', {
    direction: getSelected(c_grouping).length > 0 ? 'left' : 'right'
  });
});

onChange(sortdataset, () => {
  const dataset = getSelected(c_datasets)[0] || '';
  if (!dataset) return;
  callExternal('setSplitByState', {
    dataset,
    grouping: grouping_variables.slice(),
    sortdataset: isChecked(sortdataset),
    datasets: listObjects('datasets')
  });
});

onClick(addremove, async () => {
  const dataset = getSelected(c_datasets)[0] || '';
  const selected_grouping = getSelected(c_grouping);

  if (selected_grouping.length > 0) {
    grouping_variables = grouping_variables.filter((item) => !selected_grouping.includes(item));
  } else {
    const selected_variables = getSelected(c_variables);
    const variables_to_add = selected_variables.length > 0
      ? selected_variables
      : last_selected_variables;
    if (variables_to_add.length === 0) return;
    grouping_variables = grouping_variables.concat(
      variables_to_add.filter((item) => !grouping_variables.includes(item))
    );
  }

  setValue(c_variables, availableVariableEntries());
  setValue(c_grouping, grouping_variables);
  callExternal('setSplitByButtonDirection', { direction: 'right' });

  if (!dataset) return;
  await callExternal('setSplitByState', {
    dataset,
    grouping: grouping_variables.slice(),
    sortdataset: isChecked(sortdataset),
    datasets: listObjects('datasets')
  });
});

onClick(b_run, async () => {
  const dataset = getSelected(c_datasets)[0] || '';
  if (dataset) {
    await callExternal('setSplitByState', {
      dataset,
      grouping: grouping_variables.slice(),
      sortdataset: isChecked(sortdataset),
      datasets: listObjects('datasets')
    });
  }
  closeDialog();
});

onClick(b_reset, async () => {
  const dataset = getSelected(c_datasets)[0] || (selected_dataset === '<dataset>' ? '' : selected_dataset);
  resetDialog();
  selected_dataset = '<dataset>';
  all_variables = [];
  grouping_variables = [];
  if (dataset) {
    await callExternal('clearSplitByState', {
      dataset,
      datasets: listObjects('datasets')
    });
  }
  objectBinding.refresh();
  if (getSelected(c_datasets).length > 0) {
    triggerChange(c_datasets);
  }
  clearContent(c_variables, c_grouping);
  uncheck(sortdataset);
  callExternal('setSplitByButtonDirection', { direction: 'right' });
});

(async () => {
  if (selected_dataset === '<dataset>') {
    if (getSelected(c_datasets).length > 0) {
      triggerChange(c_datasets);
      return;
    }
    clearContent(c_variables, c_grouping);
    uncheck(sortdataset);
    callExternal('setSplitByButtonDirection', { direction: 'right' });
    return;
  }

  setSelected(c_datasets, [selected_dataset]);
  all_variables = await callExternal('getDatasetVariablesForDialog', { dataset: selected_dataset });
  const published = await callExternal('getSplitByState', { dataset: selected_dataset });
  const names = availableVariableNames();
  grouping_variables = published && Array.isArray(published.grouping)
    ? published.grouping.filter((item) => names.includes(item))
    : [];

  setValue(c_variables, availableVariableEntries());
  setValue(c_grouping, grouping_variables);

  if (published && published.sortdataset) {
    check(sortdataset);
  } else {
    uncheck(sortdataset);
  }

  callExternal('setSplitByButtonDirection', { direction: 'right' });
})();
