let name1 = '';
let name2 = '';
let variables1 = [];
let variables2 = [];
let shared = [];
let fixed = [];
let common = [];
let unpaired = [];

const buildCommand = () => {
  let target = name1;
  if (isChecked(checkbox1)) {
    target = getValue(newdataset).trim();
  }

  if (!name1 || !name2 || name1 === name2 || !target || common.length === 0) {
    return '';
  }
  if (isChecked(checkbox1) && listObjects('datasets').includes(target)) {
    return '';
  }

  const args = [getReference(dataset1), getReference(dataset2)];

  if (isChecked(checkbox1) && common.length === shared.length) {
    return target + ' <- ' + call('addCases', args);
  }

  let added1 = common.filter(variable => !variables2.includes(variable));
  let added2 = common.filter(variable => !variables1.includes(variable));
  let keep = '';

  // A whole dataset needs no list of its variable names.
  if (!isChecked(checkbox1) || variables1.every(variable => common.includes(variable))) {
    keep = 'x';
    added1 = [];
  } else if (variables2.every(variable => common.includes(variable))) {
    keep = 'y';
    added2 = [];
  }

  if (unpaired.length === 0 && added1.length + added2.length > 0) {
    args.push('keep = "all"');
  } else if (unpaired.length < added1.length + added2.length) {
    const excluded = unpaired.map(item => item.slice(4));
    args.push('keep = "all"');
    args.push('exclude = ' + JSON.stringify(excluded.join(', ')));
  } else {
    if (keep) args.push('keep = "' + keep + '"');
    if (added1.length > 0) args.push('add.x = ' + JSON.stringify(added1.join(', ')));
    if (added2.length > 0) args.push('add.y = ' + JSON.stringify(added2.join(', ')));
  }

  return target + ' <- ' + call('addCases', args);
};

const showCommand = () => {
  show(newdataset, isChecked(checkbox1));
  clearError(newdataset);
  updateSyntax(buildCommand());
};

// Keep the source prefix visible wherever an unpaired variable is displayed.
const variableLabel = (variable) => {
  if (shared.includes(variable)) return variable;
  return (variables1.includes(variable) ? '(1) ' : '(2) ') + variable;
};

const showButtonDirection = () => {
  const selected = getSelected(c_common);
  const canRemove = common.some(variable =>
    selected.includes(variableLabel(variable)) && !fixed.includes(variable));
  setLabel(button1, canRemove ? '←' : '→');
  enable(button1, canRemove || getSelected(c_unpaired).length > 0);
};

const showVariables = () => {
  setValue(c_common, common.map(variableLabel));
  setValue(c_unpaired, unpaired);
  showButtonDirection();
  showCommand();
};

// Start with all of dataset 1 when overwriting, or shared variables for a new dataset.
const selectDatasets = () => {
  const selected1 = getSelected(dataset1)[0] || '';
  const selected2 = getSelected(dataset2)[0] || '';
  let previousCommon = common;

  if (selected1 !== name1 || selected2 !== name2) {
    previousCommon = [];
    setSelected(c_common, []);
    setSelected(c_unpaired, []);
  }

  name1 = selected1;
  name2 = selected2;
  shared = [];
  fixed = [];
  common = [];
  unpaired = [];
  clearError(dataset1, dataset2, c_common);

  if (!name1 || !name2 || name1 === name2) {
    showVariables();
    return;
  }

  variables1 = listColumns(name1).map(variable => variable.name || variable);
  variables2 = listColumns(name2).map(variable => variable.name || variable);

  for (const variable of variables1) {
    if (variables2.includes(variable)) {
      common.push(variable);
    }
  }
  shared = common.slice();
  fixed = isChecked(checkbox1) ? shared : variables1;
  common = fixed.slice();

  // Keep variables already added with the arrow when the workspace refreshes.
  for (const variable of previousCommon) {
    if (!common.includes(variable) &&
        (variables1.includes(variable) || variables2.includes(variable))) {
      common.push(variable);
    }
  }

  for (const variable of variables1) {
    if (!common.includes(variable)) {
      unpaired.push('(1) ' + variable);
    }
  }
  for (const variable of variables2) {
    if (!common.includes(variable)) {
      unpaired.push('(2) ' + variable);
    }
  }

  showVariables();
};

onChange(dataset1, selectDatasets);
onChange(dataset2, selectDatasets);

onChange(c_unpaired, () => {
  setSelected(c_common, []);
  showButtonDirection();
});

onChange(c_common, () => {
  setSelected(c_unpaired, []);
  showButtonDirection();
});

onClick(button1, () => {
  const selected = getSelected(c_common);
  if (selected.length > 0) {
    // Fixed variables stay in Common; only optional additions can go back.
    common = common.filter(variable =>
      fixed.includes(variable) || !selected.includes(variableLabel(variable)));
  } else {
    for (const item of getSelected(c_unpaired)) {
      common.push(item.slice(4)); // Remove the "(1) " or "(2) " prefix.
    }
  }
  setSelected(c_common, []);
  setSelected(c_unpaired, []);
  selectDatasets();
});

onChange(checkbox1, () => {
  setSelected(c_common, []);
  setSelected(c_unpaired, []);
  selectDatasets();
});
onInput(newdataset, showCommand);

onClick(b_reset, () => {
  resetDialog();
  triggerChange(dataset1);
  triggerChange(dataset2);
});

onClick(b_run, async () => {
  selectDatasets();

  if (!name1) {
    addError(dataset1, 'Select dataset 1');
    return;
  }
  if (!name2) {
    addError(dataset2, 'Select dataset 2');
    return;
  }
  if (name1 === name2) {
    addError(dataset2, 'Select a different dataset');
    return;
  }
  if (common.length === 0) {
    addError(c_common, 'Include at least one variable');
    return;
  }

  let target = name1;
  if (isChecked(checkbox1)) {
    target = getValue(newdataset).trim();
    if (!target) {
      addError(newdataset, 'New dataset needs a name');
      return;
    }
    if (listObjects('datasets').includes(target)) {
      addError(newdataset, 'A dataset with this name already exists');
      return;
    }
  }

  const result = await run(buildCommand());
  if (result && result.ok) {
    await callExternal('refreshDatasetEditor', { datasetName: target });
  }
});

bindObjects({ dialog: 'addcases', datasets: dataset1, autoSelect: false, excludeSelected: dataset2 });
bindObjects({ dialog: 'addcases', datasets: dataset2, autoSelect: false, excludeSelected: dataset1 });
enableSearch(dataset1, dataset2, c_common, c_unpaired);
selectDatasets();
