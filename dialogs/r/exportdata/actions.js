const formats = {
    'SPSS (.sav / .zsav)': 'sav',
    'Stata (.dta)': 'dta',
    'SAS (.sas7bdat)': 'sas7bdat',
    'SAS Transport (.xpt)': 'xpt',
    'R (.rds)': 'rds',
    'Excel (.xlsx)': 'xlsx',
    'DDI (.xml)': 'xml'
};
let busy = false;
let browseToken = '';
const isSPSS = () => getValue(format) === 'SPSS (.sav / .zsav)';
const extension = () => isSPSS() && getValue(compression) === 'ZSAV'
    ? 'zsav' : formats[getValue(format)] || 'sav';
const rString = value => JSON.stringify(String(value));
const fileName = () => String(getValue(filename) || '').trim();
const validFileName = () => {
    const name = fileName().split(/[\\/]/).pop();
    return name.length > extension().length + 1
        && !/[\\/:*?\x00-\x1f]/.test(name) && !/[\x00-\x1f]/.test(fileName())
        && name.toLowerCase().endsWith('.' + extension());
};
const wantsCatalog = () => extension() === 'sas7bdat' && isChecked(catalog);
const wantsCSV = () => extension() === 'xml' && getValue(ddi_data) === 'Separate CSV';
// Format panes share coordinates, not controls, so each retains its choices.
const panes = {
    spss: [compression, label_compression, spss_recode, label_spss_recode],
    stata: [version, label_version, chartonum, label_chartonum,
        stata_recode, label_stata_recode, stata_harmonize, label_stata_harmonize],
    sas: [catalog, label_catalog, sas_recode, label_sas_recode,
        sas_harmonize, label_sas_harmonize],
    xpt: [xpt_version, label_xpt_version, xpt_recode, label_xpt_recode,
        xpt_harmonize, label_xpt_harmonize],
    r: [r_compression, label_r_compression],
    excel: [],
    ddi: [ddi_data, label_ddi_data]
};
const activePane = () => isSPSS() ? 'spss'
    : extension() === 'dta' ? 'stata' : extension() === 'xpt' ? 'xpt'
    : extension() === 'rds' ? 'r' : extension() === 'xlsx' ? 'excel'
    : extension() === 'xml' ? 'ddi' : 'sas';
const recodeControl = () => ({
    spss: spss_recode, stata: stata_recode, sas: sas_recode, xpt: xpt_recode
})[activePane()];
const harmonizeControls = {
    stata: [stata_harmonize, label_stata_harmonize],
    sas: [sas_harmonize, label_sas_harmonize],
    xpt: [xpt_harmonize, label_xpt_harmonize]
};
const buildCommand = (path = fileName()) => {
    const dataset = getSelected(c_datasets)[0];
    if (!dataset || !validFileName()) {
        return '';
    }
    // Resolve names literally, including spaces, quotes and backticks.
    const datasetExpression = 'get(' + rString(dataset) + ', envir = .GlobalEnv)';
    if (extension() === 'rds') {
        const compression = String(getValue(r_compression)).toLowerCase();
        return 'saveRDS(' + datasetExpression + ', file = ' + rString(path)
            + ', compress = ' + (compression === 'none' ? 'FALSE' : rString(compression)) + ')';
    }
    const args = [datasetExpression, 'to = ' + rString(path)];
    if (extension() === 'xlsx') {
        return 'DDIwR::convert(' + args.join(', ') + ')';
    }
    if (extension() === 'xml') {
        args.push('file_name = ' + rString(dataset));
        args.push('embed = ' + (getValue(ddi_data) === 'Embedded' ? 'TRUE' : 'FALSE'));
        if (getValue(ddi_data) === 'None') {
            args.push('csv = FALSE');
        }
        return 'DDIwR::convert(' + args.join(', ') + ')';
    }
    if (isSPSS()) {
        args.push('compress = ' + rString(String(getValue(compression)).toLowerCase()));
    }
    if (extension() === 'dta') {
        args.push('version = ' + Number(getValue(version)));
        if (isChecked(chartonum)) {
            args.push('chartonum = TRUE');
        }
    }
    if (!isChecked(recodeControl())) {
        args.push('recode = FALSE');
    }
    if (!isSPSS() && isChecked(recodeControl()) && !isChecked(harmonizeControls[activePane()][0])) {
        args.push('harmonize = FALSE');
    }
    if (wantsCatalog()) {
        args.push('catalog_to = ' + rString(path.replace(/\.sas7bdat$/i, '.sas7bcat')));
    }
    if (extension() === 'xpt') {
        args.push('version = ' + Number(getValue(xpt_version)));
        // DDIwR writes a label setup script beside its input. Stage that input
        // so a transport-only export cannot write an unsolicited file in HOME.
        const datasetExpression = args[0];
        args[0] = '.source';
        return 'local({\n' +
            '    .directory <- tempfile("dialogr-export-")\n' +
            '    dir.create(.directory)\n' +
            '    on.exit(unlink(.directory, recursive = TRUE))\n' +
            '    .source <- file.path(.directory, "data.rds")\n' +
            '    saveRDS(' + datasetExpression + ', .source)\n' +
            '    DDIwR::convert(' + args.join(', ') + ')\n' +
            '})';
    }
    return 'DDIwR::convert(' + args.join(', ') + ')';
};
const refresh = () => {
    const active = activePane();
    Object.entries(panes).forEach(([name, controls]) => {
        controls.forEach(control => show(control, name === active));
    });
    const harmonization = harmonizeControls[active];
    if (harmonization) {
        harmonization.forEach(control => enable(control, isChecked(recodeControl())));
    }
    updateSyntax(buildCommand());
};
const binding = bindObjects({ dialog: 'exportdata', datasets: c_datasets });
enableSearch(c_datasets);
onChange(c_datasets, () => {
    clearError(c_datasets);
    refresh();
});
const refreshFileName = () => {
    const name = fileName().replace(/\.(sav|zsav|dta|sas7bdat|xpt|rds|xlsx|xml)$/i, '') || 'data';
    setValue(filename, name + '.' + extension());
    clearError(filename);
    refresh();
};
onChange(format, refreshFileName);
onChange(compression, refreshFileName);
[version, xpt_version, r_compression, ddi_data, chartonum, catalog,
    spss_recode, stata_recode, sas_recode, xpt_recode,
    stata_harmonize, sas_harmonize, xpt_harmonize].forEach(control => onChange(control, refresh));
onInput(filename, refresh);
onChange(filename, () => {
    clearError(filename);
    refresh();
});
onClick(b_reset, async () => {
    if (busy) {
        return;
    }
    resetDialog();
    browseToken = '';
    await binding.refresh();
    refresh();
});
onClick(b_browse, async () => {
    if (busy) {
        return;
    }
    busy = true;
    enable(b_browse, false);
    enable(b_run, false);
    enable(b_reset, false);
    try {
        const workingDirectory = await getWorkingDirectory();
        const name = validFileName() ? fileName() : 'data.' + extension();
        const absolute = /^(?:[A-Za-z]:[\\/]|[\\/]|~[\\/])/.test(name);
        const selected = await callExternal('selectExportFile', {
            fileName: absolute ? name : String(workingDirectory).replace(/[\\/]$/, '') + '/' + name,
            extension: extension(),
            companionExtensions: []
        });
        if (selected && !selected.canceled) {
            setValue(filename, selected.filePath);
            browseToken = selected.browseToken || '';
            clearError(filename);
            refresh();
        }
    }
    catch (error) {
        addError(filename, String(error.message || error));
    }
    finally {
        busy = false;
        enable(b_browse, true);
        enable(b_run, true);
        enable(b_reset, true);
    }
});
onClick(b_run, async () => {
    if (busy) {
        return;
    }
    clearError(c_datasets, filename);
    if (!getSelected(c_datasets).length) {
        addError(c_datasets, 'No dataset selected');
        return;
    }
    if (!validFileName()) {
        addError(filename, 'Enter a file name ending in .' + extension() + '');
        return;
    }
    busy = true;
    enable(b_run, false);
    enable(b_reset, false);
    enable(b_browse, false);
    let destination;
    try {
        // Snapshot the destination and options before preparing the export.
        const outputExtension = extension();
        const command = buildCommand('__EXPORT__.' + outputExtension);
        const catalogRequested = wantsCatalog();
        const csvRequested = wantsCSV();
        destination = await callExternal('prepareExportFile', {
            fileName: fileName(),
            browseToken,
            extension: outputExtension,
            workingDirectory: await getWorkingDirectory(),
            companionExtensions: catalogRequested ? ['sas7bcat'] : csvRequested ? ['csv'] : []
        });
        if (!destination || destination.canceled) {
            return;
        }
        const actualCommand = command
            .replace(rString('__EXPORT__.' + outputExtension), rString(destination.filePath))
            .replace(rString('__EXPORT__.sas7bcat'), rString(destination.companionPaths[0] || ''));
        const result = await run(actualCommand, {
            close: false,
            dependencies: outputExtension === 'xlsx' ? ['DDIwR', 'writexl'] : ['DDIwR'],
            rPackageRequirements: catalogRequested ? [{ name: 'DDIwR', minimumVersion: '0.22.1' }] : []
        });
        if (result && result.ok) {
            await callExternal('finishExportFile', { ticket: destination.ticket });
            destination = null;
            closeDialog();
        }
    }
    catch (error) {
        addError(filename, String(error.message || error));
    }
    finally {
        if (destination && destination.ticket) {
            await callExternal('cancelExportFile', { ticket: destination.ticket });
        }
        busy = false;
        enable(b_run, true);
        enable(b_reset, true);
        enable(b_browse, true);
    }
});
refresh();
