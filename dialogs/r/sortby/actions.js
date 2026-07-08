let selected_dataset = '<dataset>';
let all_variables = [];
let sorting_variables = [];
let selection_sync_in_progress = false;

callExternal('rememberVariableSelections', {
  source: c_datasets,
  dependents: [c_variables, c_sorting]
});
enableSearch(c_datasets, c_variables);
const objectBinding = bindObjects({
  dialog: 'sortby',
  datasets: c_datasets
});
disable(dsname);
callExternal('setSortByButtonDirection', { direction: 'right' });

onChange(c_datasets, async () => {
  clearError(c_datasets);
  clearError(c_variables);
  clearError(c_sorting);
  clearError(dsname);
  selected_dataset = getSelected(c_datasets)[0] || '<dataset>';

  if (selected_dataset === '<dataset>') {
    all_variables = [];
    sorting_variables = [];
    clearContent(c_variables, c_sorting);
    callExternal('setSortByButtonDirection', { direction: 'right' });
    updateSyntax('');
    return;
  }

  all_variables = listColumns(selected_dataset);
  sorting_variables = await callExternal('keepSortByVariables', {
    sorting: sorting_variables,
    variables: all_variables
  });

  selection_sync_in_progress = true;
  setValue(c_variables, await callExternal('getSortByAvailableVariables', {
    variables: all_variables,
    sorting: sorting_variables
  }));
  setValue(c_sorting, await callExternal('getSortByChoiceItems', {
    sorting: sorting_variables
  }));
  selection_sync_in_progress = false;

  callExternal('setSortByButtonDirection', {
    direction: await callExternal('getSortByButtonDirection', {
      choiceSelected: getSelected(c_sorting),
      variableSelected: getSelected(c_variables)
    })
  });

  updateSyntax(await callExternal('buildSortByCommand', {
    dataset: selected_dataset,
    sorting: sorting_variables,
    createNew: isChecked(cb_new),
    datasetName: getValue(dsname)
  }));
});

onChange(c_variables, async () => {
  clearError(c_variables);
  if (selection_sync_in_progress) return;
  selection_sync_in_progress = true;
  setSelected(c_sorting, []);
  selection_sync_in_progress = false;
  callExternal('setSortByButtonDirection', {
    direction: await callExternal('getSortByButtonDirection', {
      choiceSelected: getSelected(c_sorting),
      variableSelected: getSelected(c_variables)
    })
  });
});

onChange(c_sorting, async () => {
  clearError(c_sorting);
  if (selection_sync_in_progress) return;
  sorting_variables = getSelected(c_sorting);
  selection_sync_in_progress = true;
  setSelected(c_variables, []);
  selection_sync_in_progress = false;
  callExternal('setSortByButtonDirection', {
    direction: await callExternal('getSortByButtonDirection', {
      choiceSelected: getSelected(c_sorting),
      variableSelected: getSelected(c_variables)
    })
  });
  updateSyntax(await callExternal('buildSortByCommand', {
    dataset: selected_dataset,
    sorting: sorting_variables,
    createNew: isChecked(cb_new),
    datasetName: getValue(dsname)
  }));
});

onChange(cb_new, async () => {
  if (isChecked(cb_new)) enable(dsname);
  else {
    disable(dsname);
    clearError(dsname);
  }
  updateSyntax(await callExternal('buildSortByCommand', {
    dataset: selected_dataset,
    sorting: sorting_variables,
    createNew: isChecked(cb_new),
    datasetName: getValue(dsname)
  }));
});

onChange(dsname, async () => {
  clearError(dsname);
  updateSyntax(await callExternal('buildSortByCommand', {
    dataset: selected_dataset,
    sorting: sorting_variables,
    createNew: isChecked(cb_new),
    datasetName: getValue(dsname)
  }));
});

onClick(addremove, async () => {
  if (getSelected(c_sorting).length > 0) {
    sorting_variables = await callExternal('removeSortByVariables', {
      sorting: sorting_variables,
      selected: getSelected(c_sorting)
    });
  } else if (getSelected(c_variables).length > 0) {
    sorting_variables = await callExternal('addSortByVariables', {
      sorting: sorting_variables,
      selected: getSelected(c_variables)
    });
  } else {
    callExternal('setSortByButtonDirection', { direction: 'right' });
    return;
  }

  selection_sync_in_progress = true;
  setValue(c_variables, await callExternal('getSortByAvailableVariables', {
    variables: all_variables,
    sorting: sorting_variables
  }));
  setValue(c_sorting, await callExternal('getSortByChoiceItems', {
    sorting: sorting_variables
  }));
  selection_sync_in_progress = false;

  callExternal('setSortByButtonDirection', {
    direction: await callExternal('getSortByButtonDirection', {
      choiceSelected: getSelected(c_sorting),
      variableSelected: getSelected(c_variables)
    })
  });

  updateSyntax(await callExternal('buildSortByCommand', {
    dataset: selected_dataset,
    sorting: sorting_variables,
    createNew: isChecked(cb_new),
    datasetName: getValue(dsname)
  }));
});

onClick(b_run, async () => {
  selected_dataset = getSelected(c_datasets)[0] || '<dataset>';
  if (getSelected(c_sorting).length > 0) sorting_variables = getSelected(c_sorting);

  if (selected_dataset === '<dataset>') {
    addError(c_datasets, 'No dataset selected');
    return;
  }

  if (!sorting_variables.length) {
    addError(c_sorting, 'No sorting variable selected');
    return;
  }

  const result = await run(await callExternal('buildSortByCommand', {
    dataset: selected_dataset,
    sorting: sorting_variables,
    createNew: isChecked(cb_new),
    datasetName: getValue(dsname)
  }));

  if (result && result.ok) {
    callExternal('refreshDatasetEditor', {
      datasetName: await callExternal('getSortByTargetDataset', {
        dataset: selected_dataset,
        createNew: isChecked(cb_new),
        datasetName: getValue(dsname)
      })
    });
  }
});

onClick(b_reset, () => {
  resetDialog();
  selected_dataset = '<dataset>';
  all_variables = [];
  sorting_variables = [];
  objectBinding.refresh();
  uncheck(cb_new);
  clearContent(dsname);
  disable(dsname);
  clearContent(c_variables, c_sorting);
  callExternal('setSortByButtonDirection', { direction: 'right' });
  updateSyntax('');
  if (getSelected(c_datasets).length > 0) triggerChange(c_datasets);
});

if (getSelected(c_datasets).length > 0) triggerChange(c_datasets);
else updateSyntax('');
