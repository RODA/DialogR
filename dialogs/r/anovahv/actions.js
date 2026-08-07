// One-way ANOVA.
//
// The dialog builds a command like:
//
//   using(
//     ess,
//     anovahv(F3_agea ~ F2_gndr)
//   )
//
// and, when pairwise comparisons are asked for, a block of two statements:
//
//   using(
//     ess,
//     {
//       anovahv(F3_agea ~ F2_gndr)
//       pairwise.t.test(F3_agea, F2_gndr, p.adjust.method = "bonferroni")
//     }
//   )

let selected_dataset = '<dataset>';
let selected_testvar = '<variable>';
let selected_groupvar = '<variable>';


// ---------------------------------------------------------------- the command

const confidenceLevel = () => {
  const percent = Number(getValue(input1)) || 95;
  return percent / 100;
};

const anovaCall = () => {
  // Only the settings that differ from the R defaults are written out, so the
  // command stays as short as the user's choices allow.
  const args = [selected_testvar + ' ~ ' + selected_groupvar];

  // The homogeneity test decides about equal variances on its own, so
  // var.equal is only written when the user answers that question directly.
  if (!isChecked(hvtest)) {
    args.push('var.equal = ' + (isChecked(r_yes) ? 'TRUE' : 'FALSE'));
  }

  if (confidenceLevel() !== 0.95) {
    args.push('conf.level = ' + confidenceLevel());
  }

  return 'anovahv(' + args.join(', ') + ')';
};

// pairwise.t.test() takes the response and the groups as two separate
// arguments, not as a formula.
const pairwiseCall = () => {
  const method = getValue(pam) || 'bonferroni';

  return 'pairwise.t.test('
    + selected_testvar + ', '
    + selected_groupvar
    + ', p.adjust.method = "' + method + '")';
};

const buildCommand = () => {
  if (selected_dataset === '<dataset>') return '';
  if (selected_testvar === '<variable>') return '';
  if (selected_groupvar === '<variable>') return '';

  // The test on its own is a single call. Adding the post-hoc comparisons
  // turns it into a block, so both run against the same data.
  const analysis = isChecked(pairwise)
    ? block([anovaCall(), pairwiseCall()])
    : anovaCall();

  return call('using', [getReference(c_datasets), analysis]);
};

const showCommand = () => {
  // The Yes / No answer only applies when the homogeneity test is switched off.
  enable(r_yes, !isChecked(hvtest));
  enable(r_no, !isChecked(hvtest));

  // The adjustment method only applies to the pairwise comparisons.
  enable(pam, isChecked(pairwise));

  updateSyntax(buildCommand());
};


// ------------------------------------------------------------------- the data

const readSelections = () => {
  selected_dataset = getSelected(c_datasets)[0] || '<dataset>';
  selected_testvar = getSelected(c_testvar)[0] || '<variable>';
  selected_groupvar = getSelected(c_groupvar)[0] || '<variable>';
};

enableSearch(c_testvar, c_groupvar);

callExternal('rememberVariableSelections', {
  source: c_datasets,
  dependents: [c_testvar, c_groupvar]
});

bindObjects({
  dialog: 'anovahv',
  datasets: c_datasets
});


// --------------------------------------------------------- user interactions

onChange(c_datasets, async () => {
  clearError(c_datasets);
  selected_dataset = getSelected(c_datasets)[0] || '<dataset>';

  if (selected_dataset === '<dataset>') {
    selected_testvar = '<variable>';
    selected_groupvar = '<variable>';
    clearContent(c_testvar, c_groupvar);
    showCommand();
    return;
  }

  const variables = await callExternal('getDatasetVariablesForDialog', {
    dataset: selected_dataset
  });

  setValue(c_testvar, variables);
  setValue(c_groupvar, variables);

  triggerChange(c_testvar);
  triggerChange(c_groupvar);
});

onChange(c_testvar, () => {
  clearError(c_testvar);
  selected_testvar = getSelected(c_testvar)[0] || '<variable>';
  showCommand();
});

onChange(c_groupvar, () => {
  clearError(c_groupvar);
  selected_groupvar = getSelected(c_groupvar)[0] || '<variable>';
  showCommand();
});

onChange(input1, () => {
  clearError(input1);
  showCommand();
});

onChange(varequal, showCommand);
onChange(hvtest, showCommand);
onChange(pairwise, showCommand);
onChange(pam, showCommand);

onClick(b_run, () => {
  readSelections();

  if (selected_dataset === '<dataset>') {
    addError(c_datasets, 'No dataset selected');
    return;
  }

  if (selected_testvar === '<variable>') {
    addError(c_testvar, 'No response variable selected');
    return;
  }

  if (selected_groupvar === '<variable>') {
    addError(c_groupvar, 'No group variable selected');
    return;
  }

  run(buildCommand());
});

onClick(b_reset, () => {
  resetDialog();
  readSelections();
  setValue(input1, '95');
  check(hvtest);
  check(r_no);
  uncheck(pairwise);
  setValue(pam, 'bonferroni');
  showCommand();
});


// The dialog opens with whatever the host restored, or with its own defaults.
if (getSelected(c_datasets).length > 0) {
  triggerChange(c_datasets);
} else {
  showCommand();
}
