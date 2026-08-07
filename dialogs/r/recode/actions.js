// Recode variables.
//
// The dialog builds a command like:
//
//   inside(
//     ess,
//     agecat <- recode(
//       F3_agea,
//       rules = "lo:30=1; 31:60=2; 61:hi=3"
//     )
//   )
//
// The dataset name is used as it stands, without any active filter: recoding
// writes back into the dataset, so it has to name the dataset itself.

let selected_dataset = '<dataset>';
let selected_variable = '<variable>';

// The two halves of the rule currently being composed.
let old_value = '';
let new_value = '';


// ---------------------------------------------------------------- the command

// Either the same variable, or the new one when the user asked for a copy.
const recodedVariable = () => {
  if (!isChecked(checkbox1)) return selected_variable;

  return getValue(i_newvar) || selected_variable;
};

const buildCommand = () => {
  const rules = getValue(c_rules) || [];

  return call('inside', [
    selected_dataset,
    recodedVariable() + ' <- ' + call('recode', [
      selected_variable,
      'rules = "' + rules.join('; ') + '"'
    ])
  ]);
};

const showCommand = () => updateSyntax(buildCommand());


// ------------------------------------------------------- composing one rule

// Each old-value option owns one input, and typing in it selects that option.
onClick(i_value_old, () => check(r_old1));
onClick(i_lowesto, () => check(r_old2));
onClick(i_from, () => check(r_old3));
onClick(i_to, () => check(r_old3));
onClick(i_tohighest, () => check(r_old4));
onClick(i_value_new, () => check(r_new1));

onChange(i_value_old, () => {
  old_value = getValue(i_value_old);
});

onChange(i_lowesto, () => {
  const lowest = getValue(i_lowesto);
  old_value = lowest ? 'lo:' + lowest : '';
});

// The range needs both ends, so the first input defers to the second.
onChange(i_from, () => triggerChange(i_to));

onChange(i_to, () => {
  const from = getValue(i_from);
  const to = getValue(i_to);
  old_value = (from && to) ? from + ':' + to : '';
});

onChange(i_tohighest, () => {
  const highest = getValue(i_tohighest);
  old_value = highest ? highest + ':hi' : '';
});

onChange(i_value_new, () => {
  new_value = getValue(i_value_new);
});

// Picking an option re-reads the input that belongs to it.
onChange(radiogroup1, () => {
  if (isChecked(r_old1)) triggerChange(i_value_old);
  if (isChecked(r_old2)) triggerChange(i_lowesto);
  if (isChecked(r_old3)) triggerChange(i_from);
  if (isChecked(r_old4)) triggerChange(i_tohighest);
  if (isChecked(r_old5)) old_value = 'missing';
  if (isChecked(r_old6)) old_value = 'else';
});

onChange(radiogroup2, () => {
  if (isChecked(r_new1)) triggerChange(i_value_new);
  if (isChecked(r_new2)) new_value = 'missing';
  if (isChecked(r_new3)) new_value = 'copy';
});


// ------------------------------------------------------------------- the data

const readSelections = () => {
  selected_dataset = getSelected(c_datasets)[0] || '<dataset>';
  selected_variable = getSelected(c_variables)[0] || '<variable>';
};

enableSearch(c_datasets, c_variables);

callExternal('rememberVariableSelections', {
  source: c_datasets,
  dependents: [c_variables]
});

bindObjects({
  dialog: 'recode',
  datasets: c_datasets,
  variables: c_variables
});


// --------------------------------------------------------- user interactions

onChange(c_datasets, () => {
  clearError(c_datasets);
  selected_dataset = getSelected(c_datasets)[0] || '<dataset>';

  if (selected_dataset === '<dataset>') {
    selected_variable = '<variable>';
    clearContent(c_variables);
  } else {
    selected_variable = getSelected(c_variables)[0] || '<variable>';
  }

  showCommand();
});

onChange(c_variables, () => {
  clearError(c_variables);
  selected_variable = getSelected(c_variables)[0] || '<variable>';
  showCommand();
});

onChange(checkbox1, () => {
  show(i_newvar, isChecked(checkbox1));
  showCommand();
});

onChange(i_newvar, () => {
  clearError(i_newvar);
  showCommand();
});

onClick(b_add, () => {
  if (!old_value && !new_value) {
    addError(c_rules, 'old and new values needed');
    return;
  }

  if (!old_value) {
    addError(c_rules, 'old value not defined');
    return;
  }

  if (!new_value) {
    addError(c_rules, 'new value not defined');
    return;
  }

  addValue(c_rules, old_value + '=' + new_value);
  clearContent(i_value_old, i_lowesto, i_from, i_to, i_tohighest, i_value_new);
  clearError(c_rules);
  showCommand();
});

onClick(b_remove, () => {
  clearValue(c_rules, getSelected(c_rules));
  showCommand();
});

onClick(b_clear, () => {
  clearContent(c_rules);
  showCommand();
});

onClick(b_run, () => {
  readSelections();

  if (selected_dataset === '<dataset>') {
    addError(c_datasets, 'No dataset selected');
    return;
  }

  if (selected_variable === '<variable>') {
    addError(c_variables, 'No variable selected');
    return;
  }

  if (!getValue(c_rules)) {
    addError(c_rules, 'No recoding rules');
    return;
  }

  if (isChecked(checkbox1) && !getValue(i_newvar)) {
    addError(i_newvar, 'New variable needs a name.');
    return;
  }

  clearError(i_newvar);
  run(buildCommand());
});

onClick(b_reset, () => {
  resetDialog();
  readSelections();
  old_value = '';
  new_value = '';
  hide(i_newvar);
  showCommand();
});


// The dialog opens with whatever the host restored, or with its own defaults.
readSelections();
showCommand();
