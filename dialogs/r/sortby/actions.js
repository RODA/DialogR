// Sort cases.
//
// The command itself is assembled by the host, which knows how a sort is
// expressed for the current dataset. This dialog decides which variables take
// part and in which order, then asks for the command to be rebuilt.

let selected_dataset = '<dataset>';
let all_variables = [];
let sorting_variables = [];

// Moving variables between the two lists changes their selection, which would
// otherwise look like the user clicking. Set while the lists are refilled.
let refilling_lists = false;


// ---------------------------------------------------------------- the command

const buildCommand = () => callExternal('buildSortByCommand', {
  dataset: selected_dataset,
  sorting: sorting_variables,
  createNew: isChecked(cb_new),
  datasetName: getValue(dsname)
});

const showCommand = async () => {
  // The new dataset needs a name only when one is being created.
  enable(dsname, isChecked(cb_new));

  if (!isChecked(cb_new)) {
    clearError(dsname);
  }

  updateSyntax(selected_dataset === '<dataset>' ? '' : await buildCommand());
};

// The button moves variables to the sorting list, or back out of it.
const showButtonDirection = async () => callExternal('setSortByButtonDirection', {
  direction: await callExternal('getSortByButtonDirection', {
    choiceSelected: getSelected(c_sorting),
    variableSelected: getSelected(c_variables)
  })
});


// ------------------------------------------------------------------- the data

const refillLists = async () => {
  refilling_lists = true;

  setValue(c_variables, await callExternal('getSortByAvailableVariables', {
    variables: all_variables,
    sorting: sorting_variables
  }));
  setValue(c_sorting, await callExternal('getSortByChoiceItems', {
    sorting: sorting_variables
  }));

  refilling_lists = false;
};

enableSearch(c_datasets, c_variables);

callExternal('rememberVariableSelections', {
  source: c_datasets,
  dependents: [c_variables, c_sorting]
});

const objectBinding = bindObjects({
  dialog: 'sortby',
  datasets: c_datasets
});

disable(dsname);
callExternal('setSortByButtonDirection', { direction: 'right' });


// --------------------------------------------------------- user interactions

onChange(c_datasets, async () => {
  clearError(c_datasets, c_variables, c_sorting, dsname);
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

  await refillLists();
  await showButtonDirection();
  await showCommand();
});

// Only one of the two lists holds a selection at a time.
onChange(c_variables, async () => {
  clearError(c_variables);
  if (refilling_lists) return;

  refilling_lists = true;
  setSelected(c_sorting, []);
  refilling_lists = false;

  await showButtonDirection();
});

onChange(c_sorting, async () => {
  clearError(c_sorting);
  if (refilling_lists) return;

  sorting_variables = getSelected(c_sorting);

  refilling_lists = true;
  setSelected(c_variables, []);
  refilling_lists = false;

  await showButtonDirection();
  await showCommand();
});

onChange(cb_new, showCommand);

onChange(dsname, async () => {
  clearError(dsname);
  await showCommand();
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

  await refillLists();
  await showButtonDirection();
  await showCommand();
});

onClick(b_run, async () => {
  selected_dataset = getSelected(c_datasets)[0] || '<dataset>';

  if (getSelected(c_sorting).length > 0) {
    sorting_variables = getSelected(c_sorting);
  }

  if (selected_dataset === '<dataset>') {
    addError(c_datasets, 'No dataset selected');
    return;
  }

  if (!sorting_variables.length) {
    addError(c_sorting, 'No sorting variable selected');
    return;
  }

  const result = await run(await buildCommand());

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

  if (getSelected(c_datasets).length > 0) {
    triggerChange(c_datasets);
  }
});


// The dialog opens with whatever the host restored, or with an empty command.
if (getSelected(c_datasets).length > 0) {
  triggerChange(c_datasets);
} else {
  updateSyntax('');
}
