// Detailed correlation test for one pair of numeric variables.
const rName = (name) => {
    const reserved = ['if', 'else', 'repeat', 'while', 'function', 'for', 'in',
        'next', 'break', 'TRUE', 'FALSE', 'NULL', 'Inf', 'NaN', 'NA',
        'NA_integer_', 'NA_real_', 'NA_complex_', 'NA_character_'];
    if (/^(?:[A-Za-z]|\.(?![0-9]))[A-Za-z0-9._]*$/.test(name) && !reserved.includes(name)) return name;
    return '`' + name.replace(/\\/g, '\\\\').replace(/`/g, '\\`')
        .replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t') + '`';
};

const chosenMethod = () => isChecked(r_spearman) ? 'spearman' : isChecked(r_kendall) ? 'kendall' : 'pearson';
const chosenAlternative = () => isChecked(r_greater) ? 'greater' : isChecked(r_less) ? 'less' : 'two.sided';
const validConfidence = () => {
    const value = Number(getValue(confidence));
    return Number.isFinite(value) && value > 0 && value < 100;
};

const buildCommand = () => {
    const dataset = getSelected(c_datasets)[0];
    const variables = getSelected(c_variables);
    if (!dataset || variables.length !== 2) return '';
    const [x, y] = variables;
    const methodName = chosenMethod();
    if (methodName === 'pearson' && !validConfidence()) return '';
    const args = [rName(x), rName(y)];
    if (methodName !== 'pearson') args.push('method = "' + methodName + '"');
    if (chosenAlternative() !== 'two.sided') args.push('alternative = "' + chosenAlternative() + '"');
    if (methodName === 'pearson' && Number(getValue(confidence)) !== 95) {
        args.push('conf.level = ' + Number(getValue(confidence)) / 100);
    }
    const reference = getReference(c_datasets);
    return call('using', [reference === dataset ? rName(dataset) : reference,
        'cor.test(' + args.join(', ') + ')']);
};

const showCommand = () => {
    const pearson = chosenMethod() === 'pearson';
    enable(confidence, pearson);
    enable(label_confidence, pearson);
    enable(label_percent, pearson);
    clearError(confidence);
    updateSyntax(buildCommand());
};

const showVariables = () => {
    const dataset = getSelected(c_datasets)[0];
    const variables = dataset ? listColumns(dataset) : [];
    const names = variables.map(variable => variable.name || variable);
    // Also constrain selections restored from an older dialog session.
    const selected = getSelected(c_variables)
        .filter(name => names.includes(name))
        .slice(0, 2);

    setValue(c_variables, variables.map(variable => {
        const entry = typeof variable === 'string' ? { name: variable } : variable;
        return {
            ...entry,
            enabled: entry.enabled !== false
                && (selected.length < 2 || selected.includes(entry.name))
        };
    }));
    setSelected(c_variables, selected);
    showCommand();
};

callExternal('rememberVariableSelections', { source: c_datasets, dependents: [c_variables] });
// The variable list is managed here so workspace binding cannot overwrite its limits.
const binding = bindObjects({ dialog: 'bivariate', datasets: c_datasets });
enableSearch(c_datasets, c_variables);

onChange(c_datasets, () => {
    clearError(c_datasets, c_variables);
    showVariables();
});
onChange(c_variables, () => {
    clearError(c_variables);
    showVariables();
});
onChange(method, showCommand);
onChange(alternative, showCommand);
onInput(confidence, showCommand);
onChange(confidence, showCommand);

onClick(b_run, async () => {
    clearError(c_datasets, c_variables, confidence);
    if (!getSelected(c_datasets).length) {
        addError(c_datasets, 'No dataset selected');
        return;
    }
    if (getSelected(c_variables).length !== 2) {
        addError(c_variables, 'Select exactly two variables');
        return;
    }
    if (chosenMethod() === 'pearson' && !validConfidence()) {
        addError(confidence, 'Enter a confidence level greater than 0 and less than 100');
        return;
    }
    await run(buildCommand());
});

onClick(b_reset, async () => {
    resetDialog();
    await binding.refresh();
    showVariables();
});

showVariables();
