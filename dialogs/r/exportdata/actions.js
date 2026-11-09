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
let versionDefault = null;
let versionRequest = 0;
let versionDefaultReady = Promise.resolve();
const isSPSS = () => getValue(format) === 'SPSS (.sav / .zsav)';
const extension = () => isSPSS() && isChecked(spss_zsav)
    ? 'zsav' : formats[getValue(format)] || 'sav';
const rString = value => JSON.stringify(String(value));
const rName = name => {
    const reserved = ['if', 'else', 'repeat', 'while', 'function', 'for', 'in',
        'next', 'break', 'TRUE', 'FALSE', 'NULL', 'Inf', 'NaN', 'NA',
        'NA_integer_', 'NA_real_', 'NA_complex_', 'NA_character_'];
    if (/^(?:[A-Za-z]|\.(?![0-9]))[A-Za-z0-9._]*$/.test(name) && !reserved.includes(name)) {
        return name;
    }
    return '`' + name.replace(/\\/g, '\\\\').replace(/`/g, '\\`')
        .replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t') + '`';
};
const fileName = () => String(getValue(filename) || '').trim();
const validFileName = () => {
    const name = fileName().split(/[\\/]/).pop();
    return name.length > extension().length + 1
        && !/[\\/:*?\x00-\x1f]/.test(name) && !/[\x00-\x1f]/.test(fileName())
        && name.toLowerCase().endsWith('.' + extension());
};
const wantsCatalog = () => extension() === 'sas7bdat' && isChecked(catalog);
const wantsSetup = () => extension() === 'xpt' && isChecked(xpt_setup);
const wantsCSV = () => extension() === 'xml' && isChecked(ddi_csv);
// Format panes share coordinates, not controls, so each retains its choices.
const panes = {
    spss: [label_compression, spss_none, label_spss_none, spss_byte, label_spss_byte,
        spss_zsav, label_spss_zsav, spss_recode, label_spss_recode],
    stata: [version, label_version, chartonum, label_chartonum,
        stata_recode, label_stata_recode, stata_harmonize, label_stata_harmonize],
    sas: [catalog, label_catalog, sas_recode, label_sas_recode,
        sas_harmonize, label_sas_harmonize],
    xpt: [xpt_version, label_xpt_version, xpt_recode, label_xpt_recode,
        xpt_harmonize, label_xpt_harmonize, xpt_setup, label_xpt_setup],
    r: [label_r_compression, r_none, label_r_none, r_gzip, label_r_gzip,
        r_bzip2, label_r_bzip2, r_xz, label_r_xz],
    excel: [],
    ddi: [label_ddi_data, ddi_none, label_ddi_none, ddi_embedded,
        label_ddi_embedded, ddi_csv, label_ddi_csv]
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
    const datasetExpression = rName(dataset);
    if (extension() === 'rds') {
        const args = [datasetExpression, 'file = ' + rString(path)];
        if (isChecked(r_none)) {
            args.push('compress = FALSE');
        } else if (isChecked(r_bzip2)) {
            args.push('compress = "bzip2"');
        } else if (isChecked(r_xz)) {
            args.push('compress = "xz"');
        }
        return 'saveRDS(' + args.join(', ') + ')';
    }
    const args = [datasetExpression, 'to = ' + rString(path)];
    if (extension() === 'xlsx') {
        return 'convert(' + args.join(', ') + ')';
    }
    if (extension() === 'xml') {
        if (!isChecked(ddi_embedded)) {
            args.push('embed = FALSE');
        }
        if (isChecked(ddi_none)) {
            args.push('csv = FALSE');
        }
        return 'convert(' + args.join(', ') + ')';
    }
    if (isSPSS() && isChecked(spss_none)) {
        args.push('compress = "none"');
    }
    if (extension() === 'dta') {
        const selectedVersion = Number(getValue(version));
        if (selectedVersion !== versionDefault) {
            args.push('version = ' + selectedVersion);
        }
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
    if (extension() === 'sas7bdat' && !wantsCatalog()) {
        args.push('catalog = NULL');
    }
    if (extension() === 'xpt') {
        const selectedVersion = Number(getValue(xpt_version));
        if (selectedVersion !== versionDefault) {
            args.push('version = ' + selectedVersion);
        }
        if (!wantsSetup()) {
            args.push('setup = FALSE');
        }
    }
    return 'convert(' + args.join(', ') + ')';
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
const refreshVersionDefault = () => {
    const dataset = getSelected(c_datasets)[0];
    const format = extension();
    const request = ++versionRequest;
    versionDefault = null;
    refresh();
    versionDefaultReady = dataset && (format === 'dta' || format === 'xpt')
        ? callExternal('DialogR.exportDefaultVersion', { dataset, format }).then(value => {
            if (request === versionRequest) {
                versionDefault = value;
                updateSyntax(buildCommand());
            }
        }, () => {
            // Keep the selected version explicit if the runtime cannot read its default.
        })
        : Promise.resolve();
};
const binding = bindObjects({ dialog: 'exportdata', datasets: c_datasets });
enableSearch(c_datasets);
onChange(c_datasets, () => {
    clearError(c_datasets);
    refreshVersionDefault();
});
const refreshFileName = () => {
    const name = fileName().replace(/\.(sav|zsav|dta|sas7bdat|xpt|rds|xlsx|xml)$/i, '') || 'data';
    setValue(filename, name + '.' + extension());
    clearError(filename);
    refreshVersionDefault();
};
onChange(format, refreshFileName);
onChange(spss_compression, refreshFileName);
[version, xpt_version, r_compression, ddi_data, chartonum, catalog, xpt_setup,
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
    setValue(version, '14');
    browseToken = '';
    await binding.refresh();
    refreshVersionDefault();
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
        await versionDefaultReady;
        // Snapshot the destination and options before preparing the export.
        const outputExtension = extension();
        const command = buildCommand('__EXPORT__.' + outputExtension);
        const companionExtensions = wantsCSV() ? ['csv'] : [];
        const setupRequested = wantsSetup();
        const optionalCompanionExtension = setupRequested ? 'sas' : wantsCatalog() ? 'sas7bcat' : '';
        // DDIwR can overwrite the setup script in place.
        const optionalCompanionQuery = setupRequested
            ? 'if (DDIwR::hasLabels(' + rName(getSelected(c_datasets)[0]) + ')) "yes" else "no"'
            : '';
        destination = await callExternal('prepareExportFile', {
            fileName: fileName(),
            browseToken,
            extension: outputExtension,
            workingDirectory: await getWorkingDirectory(),
            companionExtensions,
            optionalCompanionExtension,
            optionalCompanionQuery
        });
        if (!destination || destination.canceled) {
            return;
        }
        const actualCommand = command
            .replace(rString('__EXPORT__.' + outputExtension), () => rString(destination.filePath));
        const result = await run(actualCommand, {
            close: false,
            dependencies: outputExtension === 'xlsx' ? ['DDIwR', 'writexl'] : ['DDIwR'],
            rPackageRequirements: ['sas7bdat', 'xpt'].includes(outputExtension)
                ? [{ name: 'DDIwR', minimumVersion: '0.24' }] : []
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
setValue(version, '14');
refreshVersionDefault();
