// One-sample t-test.
//
// The dialog builds a command like:
//
//   using(
//     ess,
//     t.test(F3_agea, alternative = "two.sided", mu = 0, conf.level = 0.95)
//   )

let selected_dataset = '<dataset>';
let selected_variable = '<variable>';


// ---------------------------------------------------------------- the command

const testedMean = () => String(getValue(mu) || '0').trim() || '0';

const confidenceLevel = () => {
  const percent = Number(getValue(cl)) || 95;
  return percent / 100;
};

const chosenAlternative = () => {
  if (isChecked(r_gt)) return 'greater';
  if (isChecked(r_lt)) return 'less';
  return 'two.sided';
};

const buildCommand = () => {
  if (selected_dataset === '<dataset>') return '';
  if (selected_variable === '<variable>') return '';

  const args = [
    selected_variable,
    'alternative = "' + chosenAlternative() + '"',
    'mu = ' + testedMean(),
    'conf.level = ' + confidenceLevel()
  ];

  return call('using', [
    getReference(c_datasets),
    't.test(' + args.join(', ') + ')'
  ]);
};

const showCommand = () => {
  // The three hypothesis labels repeat whichever mean is being tested.
  setValue(neqlabel, 'μ ≠ ' + testedMean());
  setValue(gtlabel, 'μ > ' + testedMean());
  setValue(ltlabel, 'μ < ' + testedMean());

  updateSyntax(buildCommand());
};


// ------------------------------------------------------------------- the data

const readSelections = () => {
  selected_dataset = getSelected(c_datasets)[0] || '<dataset>';
  selected_variable = getSelected(c_variables)[0] || '<variable>';
};

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


// --------------------------------------------------------- user interactions

onChange(c_datasets, async () => {
  clearError(c_datasets);
  selected_dataset = getSelected(c_datasets)[0] || '<dataset>';

  if (selected_dataset === '<dataset>') {
    selected_variable = '<variable>';
    clearContent(c_variables);
    showCommand();
    return;
  }

  setValue(c_variables, await callExternal('getDatasetVariablesForDialog', {
    dataset: selected_dataset
  }));

  triggerChange(c_variables);
});

onChange(c_variables, () => {
  clearError(c_variables);
  selected_variable = getSelected(c_variables)[0] || '<variable>';
  showCommand();
});

onChange(mu, () => {
  clearError(mu);
  showCommand();
});

onChange(cl, () => {
  clearError(cl);
  showCommand();
});

onChange(radiogroup1, showCommand);

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

  run(buildCommand());
});

onClick(b_reset, () => {
  resetDialog();
  readSelections();
  setValue(mu, '0');
  setValue(cl, '95');
  check(r_neq);
  showCommand();
});


// The dialog opens with whatever the host restored, or with its own defaults.
if (getSelected(c_datasets).length > 0) {
  triggerChange(c_datasets);
} else {
  showCommand();
}
