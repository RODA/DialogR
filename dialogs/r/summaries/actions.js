let statistic_lock = false;

const summary_controls = {
  datasets: c_datasets,
  variables: c_variables,
  statistics: {
    summary: cb_summary,
    quantile: cb_quantile,
    mode: cb_mode,
    mean: cb_mean,
    median: cb_median,
    iqr: cb_iqr,
    range: cb_range,
    var: cb_var,
    sd: cb_sd
  }
};

callExternal('rememberVariableSelections', {
  source: c_datasets,
  dependents: [c_variables]
});
enableSearch(c_datasets, c_variables);
bindObjects({
  dialog: 'summaries',
  datasets: c_datasets,
  variables: c_variables
});

onChange(c_datasets, async () => {
  clearError(c_datasets);
  clearError(c_variables);
  await callExternal('refreshSummarySyntax', summary_controls);
});

onChange(c_variables, async () => {
  clearError(c_variables);
  await callExternal('refreshSummarySyntax', summary_controls);
});

onChange(cb_summary, async () => {
  if (statistic_lock) return;
  statistic_lock = true;
  await callExternal('syncSummaryStatisticSelection', { active: cb_summary, controls: summary_controls });
  statistic_lock = false;
  await callExternal('refreshSummarySyntax', summary_controls);
});

onChange(cb_quantile, async () => {
  if (statistic_lock) return;
  statistic_lock = true;
  await callExternal('syncSummaryStatisticSelection', { active: cb_quantile, controls: summary_controls });
  statistic_lock = false;
  await callExternal('refreshSummarySyntax', summary_controls);
});

onChange(cb_mode, async () => {
  if (statistic_lock) return;
  statistic_lock = true;
  await callExternal('syncSummaryStatisticSelection', { active: cb_mode, controls: summary_controls });
  statistic_lock = false;
  await callExternal('refreshSummarySyntax', summary_controls);
});

onChange(cb_mean, async () => {
  if (statistic_lock) return;
  statistic_lock = true;
  await callExternal('syncSummaryStatisticSelection', { active: cb_mean, controls: summary_controls });
  statistic_lock = false;
  await callExternal('refreshSummarySyntax', summary_controls);
});

onChange(cb_median, async () => {
  if (statistic_lock) return;
  statistic_lock = true;
  await callExternal('syncSummaryStatisticSelection', { active: cb_median, controls: summary_controls });
  statistic_lock = false;
  await callExternal('refreshSummarySyntax', summary_controls);
});

onChange(cb_iqr, async () => {
  if (statistic_lock) return;
  statistic_lock = true;
  await callExternal('syncSummaryStatisticSelection', { active: cb_iqr, controls: summary_controls });
  statistic_lock = false;
  await callExternal('refreshSummarySyntax', summary_controls);
});

onChange(cb_range, async () => {
  if (statistic_lock) return;
  statistic_lock = true;
  await callExternal('syncSummaryStatisticSelection', { active: cb_range, controls: summary_controls });
  statistic_lock = false;
  await callExternal('refreshSummarySyntax', summary_controls);
});

onChange(cb_var, async () => {
  if (statistic_lock) return;
  statistic_lock = true;
  await callExternal('syncSummaryStatisticSelection', { active: cb_var, controls: summary_controls });
  statistic_lock = false;
  await callExternal('refreshSummarySyntax', summary_controls);
});

onChange(cb_sd, async () => {
  if (statistic_lock) return;
  statistic_lock = true;
  await callExternal('syncSummaryStatisticSelection', { active: cb_sd, controls: summary_controls });
  statistic_lock = false;
  await callExternal('refreshSummarySyntax', summary_controls);
});

onClick(b_run, async () => {
  clearError(c_datasets);
  clearError(c_variables);
  const selected_dataset = getSelected(c_datasets)[0] || '<dataset>';
  const selected_variables = getSelected(c_variables);

  if (selected_dataset === '<dataset>') {
    addError(c_datasets, 'No dataset selected');
    return;
  }

  if (selected_variables.length === 0) {
    addError(c_variables, 'No variable selected');
    return;
  }

  if (!await callExternal('hasSummaryStatisticSelection', summary_controls)) {
    addError(cb_summary, 'Select at least one summary statistic');
    return;
  }

  run(await callExternal('refreshSummarySyntax', summary_controls));
});

onClick(b_reset, async () => {
  resetDialog();
  bindObjects({
    dialog: 'summaries',
    datasets: c_datasets,
    variables: c_variables
  }).refresh();
  clearContent(c_variables);
  await callExternal('refreshSummarySyntax', summary_controls);
  if (getSelected(c_datasets).length > 0) triggerChange(c_datasets);
});

if (getSelected(c_datasets).length > 0) {
  triggerChange(c_datasets);
} else {
  callExternal('refreshSummarySyntax', summary_controls);
}
