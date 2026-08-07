// Subset cases and variables.
//
// The dialog builds a command like:
//
//   ess_urban <- subset(
//     ess,
//     F1_domicil == 1,
//     select = c(F2_gndr, F3_agea)
//   )
//
// "Filter out unselected cases" does not run anything: it stores that same
// subset() call as the dataset's filter, and the analysis dialogs pick it up
// through getReference().

let selected_dataset = '<dataset>';
let all_variables = [];


// ---------------------------------------------------------------- the command

const rowMode = () => {
  if (isChecked(rd_new)) return 'new';
  if (isChecked(rd_filter)) return 'filter';
  if (isChecked(rd_delete)) return 'delete';
  return 'allcases';
};

const usesExpression = () => rowMode() !== 'allcases';
const usesAllVariables = () => isChecked(cb_allvars);
const targetDatasetName = () => String(getValue(newname) || '').trim();

// The expression editor may wrap, but R wants it on one line.
const subsetExpression = () => String(getValue(expression) || '').replace(/\r?\n+/g, ' ').trim();

const buildSubsetCall = () => {
  if (selected_dataset === '<dataset>') return '';

  const expr = subsetExpression();
  const variables = usesAllVariables() ? [] : getSelected(c_variables);
  const keeps_cases = usesExpression() && expr.length > 0;
  const keeps_variables = !usesAllVariables() && variables.length > 0;

  // Without either half there is nothing to subset.
  if (!keeps_cases && !keeps_variables) return '';

  return call('subset', [
    selected_dataset,
    keeps_cases ? expr : '',
    keeps_variables ? 'select = c(' + variables.join(', ') + ')' : ''
  ]);
};

// Only the modes that produce a dataset assign to a name.
const assignmentTarget = () => {
  if (rowMode() === 'new') return targetDatasetName();
  if (rowMode() === 'delete') return selected_dataset;

  return '';
};

// What the syntax panel shows, including the filter preview.
const buildDisplayCommand = () => {
  const subsetCall = buildSubsetCall();
  if (!subsetCall) return '';

  const target = assignmentTarget();
  if (target) return target + ' <- ' + subsetCall;

  return rowMode() === 'filter' ? subsetCall : '';
};

// What actually runs. Filtering and All cases only update dataset state.
const buildExecutionCommand = () => {
  const subsetCall = buildSubsetCall();
  const target = assignmentTarget();

  if (!subsetCall || !target) return '';

  return target + ' <- ' + subsetCall;
};

const showCommand = () => {
  // A new dataset is the only mode that needs a name for the result.
  show(label15);
  show(newname, rowMode() === 'new');
  enable(newname, rowMode() === 'new');

  if (rowMode() !== 'new') {
    clearError(newname);
  }

  // The expression only applies when some cases are being left out.
  enable(expression, usesExpression());

  if (!usesExpression()) {
    clearError(expression);
  }

  // Picking variables is pointless while all of them are kept.
  clearError(c_variables);
  enable(c_variables, !usesAllVariables());

  updateSyntax(buildDisplayCommand());
  void callExternal('refreshSelectExpressionMonaco');
};


// ------------------------------------------------------------------- the data

const datasetsList = () => listObjects('datasets');

enableSearch(c_datasets, c_variables);

callExternal('rememberVariableSelections', {
  source: c_datasets,
  dependents: [c_variables]
});

const objectBinding = bindObjects({
  dialog: 'select',
  datasets: c_datasets
});

callExternal('bindSelectExpressionMonaco', {
  input: 'expression',
  dataset: 'c_datasets'
});


// --------------------------------------------------------- user interactions

onChange(c_datasets, async () => {
  clearError(c_datasets);
  clearError(c_variables);
  selected_dataset = getSelected(c_datasets)[0] || '<dataset>';

  if (selected_dataset === '<dataset>') {
    all_variables = [];
    clearContent(c_variables);
    showCommand();
    return;
  }

  all_variables = await callExternal('getDatasetVariablesForDialog', {
    dataset: selected_dataset
  });
  setValue(c_variables, all_variables);
  showCommand();
});

onChange(c_variables, showCommand);
onChange(cb_allvars, showCommand);
onChange(expression, showCommand);
onChange(newname, showCommand);

onChange(radiogroup1, () => {
  clearError(expression);
  clearError(newname);
  showCommand();
});

onClick(b_run, async () => {
  const mode = rowMode();
  const variables = usesAllVariables() ? [] : getSelected(c_variables);
  const subsetCall = buildSubsetCall();

  if (selected_dataset === '<dataset>') {
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

  // Filtering and All cases only change what the dataset means from now on.
  if (mode === 'filter' || mode === 'allcases') {
    if (mode === 'filter' && subsetCall) {
      await callExternal('setFilterState', {
        dataset: selected_dataset,
        command: subsetCall,
        datasets: datasetsList()
      });
    } else {
      await callExternal('clearFilterState', {
        dataset: selected_dataset,
        datasets: datasetsList()
      });
    }

    closeDialog();
    return;
  }

  const command = buildExecutionCommand();
  if (!command) {
    closeDialog();
    return;
  }

  const target = mode === 'new' ? targetDatasetName() : selected_dataset;
  const result = await run(command);

  if (result && result.ok) {
    if (mode === 'new') {
      await callExternal('inheritSubsetDatasetState', {
        source: selected_dataset,
        target: target,
        variables: variables.length > 0 ? variables : all_variables,
        datasets: datasetsList().concat(target)
      });
    }

    if (mode === 'delete') {
      await callExternal('clearFilterState', {
        dataset: selected_dataset,
        datasets: datasetsList()
      });
    }

    await callExternal('refreshDatasetEditor', { datasetName: target });
  }
});

onClick(b_reset, async () => {
  resetDialog();
  selected_dataset = '<dataset>';
  all_variables = [];
  objectBinding.refresh();
  clearContent(c_variables);
  showCommand();

  if (getSelected(c_datasets).length > 0) {
    triggerChange(c_datasets);
  }
});


// The dialog opens with whatever the host restored, or with its own defaults.
if (getSelected(c_datasets).length > 0) {
  triggerChange(c_datasets);
} else {
  showCommand();
}
