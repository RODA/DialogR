'use strict';
const { spawnSync } = require('node:child_process');
const { createHarness, source, root, path, fs, assert, settle } = require('./support');

async function main() {
    const h = await createHarness(process.env.DIALOGR_TEST_BROWSER || 'chromium');
    const output = path.join(root, 'artifacts/export-dialog');
    fs.mkdirSync(output, { recursive: true });
    const choose = async (name, value) => {
        await h.control(name).locator('select').selectOption(value);
        await settle(h.frame);
    };
    try {
        await h.frame.evaluate(() => {
            const invoke = window.dialogForge.dialogRuntime.invoke;
            window.dialogForge.dialogRuntime.invoke = (channel, ...args) => {
                if (channel === 'base-app:callDialogExternal' && args[0] === 'DialogR.exportDefaultVersion') {
                    const value = args[1].format === 'dta' ? 14 : 5;
                    return Promise.resolve({ status: 'ready', name: args[0], value, message: '' });
                }
                return invoke(channel, ...args);
            };
        });
        const panes = [
            ['SPSS (.sav / .zsav)', ['spss_none', 'spss_byte', 'spss_zsav', 'spss_recode']],
            ['Stata (.dta)', ['version', 'chartonum', 'stata_recode', 'stata_harmonize']],
            ['SAS (.sas7bdat)', ['catalog', 'sas_recode', 'sas_harmonize']],
            ['SAS Transport (.xpt)', ['xpt_version', 'xpt_recode', 'xpt_harmonize', 'xpt_setup']],
            ['R (.rds)', ['r_none', 'r_gzip', 'r_bzip2', 'r_xz']],
            ['Excel (.xlsx)', []],
            ['DDI (.xml)', ['ddi_none', 'ddi_embedded', 'ddi_csv']]
        ];
        const paneControls = panes.flatMap(([, controls]) => controls);
        for (const locale of Object.keys(source('exportdata').i18n.locales)) {
            await h.load('exportdata', locale);
            await h.choose('c_datasets', 'first');
            for (const [format, visible] of panes) {
                await choose('format', format);
                for (const name of paneControls) {
                    assert.equal(await h.control(name).isVisible(), visible.includes(name), locale + '/' + format + '/' + name);
                    assert.equal(await h.control('label_' + name).isVisible(), visible.includes(name), 'Label visibility: ' + name);
                }
                // Check actual rendered translations, including multi-line labels.
                const boxes = [];
                for (const name of visible) {
                    const control = await h.control(name).boundingBox();
                    const label = await h.control('label_' + name).boundingBox();
                    assert.ok(label.x + label.width <= 510, locale + ': label exceeds dialog width');
                    if (!['version', 'xpt_version'].includes(name)) {
                        assert.ok(label.x >= control.x + control.width, locale + ': label overlaps toggle');
                        const previous = boxes.at(-1);
                        if (previous) assert.ok(label.y >= previous.bottom + 2, locale + ': option rows overlap');
                    }
                    boxes.push({ bottom: Math.max(control.y + control.height, label.y + label.height) });
                }
                await h.assertClean();
            }
            await choose('format', 'SAS Transport (.xpt)');
            await choose('xpt_version', '8');
            assert.match(await h.syntax(), /version = 8/);
            if (['el_GR', 'de_DE', 'fr_FR'].includes(locale)) {
                await choose('format', 'Stata (.dta)');
                await h.page.screenshot({ path: path.join(output, locale + '-pane.png'), clip: { x: 0, y: 0, width: 525, height: 375 } });
            }
            await h.click('b_reset');
            assert.equal(await h.control('spss_byte').locator('input[type=radio]').isChecked(), true);
            assert.equal(await h.control('spss_recode').isVisible(), true);
            await h.assertClean();
        }
        await h.load('exportdata');
        await h.choose('c_datasets', 'first');
        const commands = [];
        for (const [mode, ext] of [['Byte', 'sav'], ['None', 'sav'], ['ZSAV', 'zsav']]) {
            await h.click('spss_' + mode.toLowerCase());
            assert.equal(await h.control('filename').locator('input,textarea').inputValue(), 'data.' + ext);
            const command = await h.syntax();
            const compression = mode === 'None' ? ', compress = "none"' : '';
            assert.equal(command, 'convert(first, to = "data.' + ext + '"' + compression + ')');
            assert.doesNotMatch(command, /harmonize|version =/);
            commands.push({ name: mode, command, file: 'data.' + ext });
        }
        await h.page.screenshot({ path: path.join(output, 'spss.png'), clip: { x: 0, y: 0, width: 525, height: 375 } });
        await choose('format', 'SAS Transport (.xpt)');
        await h.choose('c_datasets', 'second');
        assert.equal(await h.control('spss_byte').isVisible(), false);
        assert.equal(await h.control('xpt_version').locator('select').isEnabled(), true);
        for (const version of ['5', '8']) {
            await choose('xpt_version', version);
            const command = await h.syntax();
            assert.equal(command, 'convert(second, to = "data.xpt"' + (version === '5' ? '' : ', version = 8') + ')');
            commands.push({ name: 'XPT ' + version, command, file: 'data.xpt' });
        }
        await h.page.screenshot({ path: path.join(output, 'sas-transport.png'), clip: { x: 0, y: 0, width: 525, height: 375 } });
        await choose('xpt_version', '5');
        await h.click('xpt_setup');
        assert.equal(await h.syntax(), 'convert(second, to = "data.xpt", setup = FALSE)');
        await h.choose('c_datasets', 'first');
        await choose('format', 'SAS (.sas7bdat)');
        assert.equal(await h.syntax(), 'convert(first, to = "data.sas7bdat")');
        await h.click('catalog');
        assert.equal(await h.syntax(), 'convert(first, to = "data.sas7bdat", catalog = NULL)');
        await choose('format', 'R (.rds)');
        assert.equal(await h.control('filename').locator('input,textarea').inputValue(), 'data.rds');
        for (const mode of ['Gzip', 'None', 'Bzip2', 'XZ']) {
            await h.click('r_' + mode.toLowerCase());
            const command = await h.syntax();
            const compression = mode === 'Gzip' ? '' : ', compress = ' + (mode === 'None' ? 'FALSE' : JSON.stringify(mode.toLowerCase()));
            assert.equal(command, 'saveRDS(first, file = "data.rds"' + compression + ')');
            assert.doesNotMatch(command, /recode|harmonize|DDIwR/);
            commands.push({ name: 'R ' + mode, command, file: 'data.rds' });
        }
        await h.click('r_gzip');
        await h.page.screenshot({ path: path.join(output, 'r-pane.png'), clip: { x: 0, y: 0, width: 525, height: 375 } });
        await choose('format', 'Excel (.xlsx)');
        assert.equal(await h.control('filename').locator('input,textarea').inputValue(), 'data.xlsx');
        assert.equal(await h.syntax(), 'convert(first, to = "data.xlsx")');
        commands.push({ name: 'Excel', command: await h.syntax(), file: 'data.xlsx' });
        await h.page.screenshot({ path: path.join(output, 'excel-pane.png'), clip: { x: 0, y: 0, width: 525, height: 375 } });
        await choose('format', 'DDI (.xml)');
        assert.equal(await h.control('ddi_embedded').locator('input[type=radio]').isChecked(), true);
        for (const [mode, file] of [['embedded', 'embedded.xml'], ['csv', 'separate.xml'], ['none', 'metadata.xml']]) {
            await h.click('ddi_' + mode);
            await h.fill('filename', file);
            const command = await h.syntax();
            const data = mode === 'embedded' ? '' : ', embed = FALSE' + (mode === 'none' ? ', csv = FALSE' : '');
            assert.equal(command, 'convert(first, to = "' + file + '"' + data + ')');
            assert.doesNotMatch(command, /recode|harmonize|compress =/);
            commands.push({ name: 'DDI ' + mode, command, file });
        }
        await h.click('ddi_csv');
        await h.fill('filename', 'data.xml');
        await h.page.screenshot({ path: path.join(output, 'ddi-pane.png'), clip: { x: 0, y: 0, width: 525, height: 375 } });
        await choose('format', 'Stata (.dta)');
        assert.deepEqual(await h.control('version').locator('option').allTextContents(), ['15', '14', '13', '12', '11', '10', '9', '8']);
        assert.equal(await h.syntax(), 'convert(first, to = "data.dta")');
        assert.equal(await h.control('xpt_version').isVisible(), false);
        await h.page.screenshot({ path: path.join(output, 'stata-pane.png'), clip: { x: 0, y: 0, width: 525, height: 375 } });
        await h.click('stata_recode');
        assert.match(await h.syntax(), /recode = FALSE/);
        assert.equal(await h.control('stata_harmonize').locator('[role=checkbox]').getAttribute('aria-disabled'), 'true');
        await choose('format', 'SPSS (.sav / .zsav)');
        assert.doesNotMatch(await h.syntax(), /recode = FALSE/);
        await choose('format', 'Stata (.dta)');
        assert.match(await h.syntax(), /recode = FALSE/);
        await h.fill('filename', 'wrong.xpt');
        assert.equal(await h.syntax(), '');
        await h.assertClean();
        // Optional native-R validation, using the current development package.
        // No WebR runtime is started by this rendered control test.
        if (process.env.DIALOGR_DDIWR_SOURCE) {
            const result = spawnSync('Rscript', ['--vanilla', '-'], {
                encoding: 'utf8', timeout: 60000,
                input: 'pkgload::load_all(' + JSON.stringify(process.env.DIALOGR_DDIWR_SOURCE) + ', quiet=TRUE)\n' +
                    'local({\n.directory <- tempfile(); dir.create(.directory)\n.previous <- setwd(.directory)\n' +
                    'on.exit({setwd(.previous); unlink(.directory, recursive=TRUE); rm(first, second, envir=.GlobalEnv)})\n' +
                    'first <<- data.frame(id=1:3, answer=declared::declared(c(1,9,2), label="Answer", labels=c(Yes=1,Missing=9,No=2), na_values=9))\n' +
                    'second <<- data.frame(id=1:3, answer=c(1,9,2))\n' +
                    commands.map(({ name, command, file }) => command + '\n' +
                        'stopifnot(file.exists(' + JSON.stringify(file) + '))\n' +
                        (file === 'metadata.xml'
                            ? '.xml <- xml2::read_xml("metadata.xml"); stopifnot(length(xml2::xml_find_all(.xml, "//*[local-name()=\'var\']"))==2)\n'
                            : '.read <- DDIwR::convert(' + JSON.stringify(file) + ', recode=FALSE, declared=FALSE)\n' +
                                'stopifnot(nrow(.read)==3, identical(as.numeric(.read$id), c(1,2,3)))\n') +
                        (file === 'separate.xml' ? 'stopifnot(file.exists("separate.csv"))\n' : '') +
                        (file === 'data.xlsx' ? 'stopifnot(identical(readxl::excel_sheets("data.xlsx"), c("data","variables","values")), "Answer" %in% readxl::read_excel("data.xlsx", sheet="variables")$label)\n' : '') +
                        (file.endsWith('.rds') ? 'stopifnot(identical(readRDS(' + JSON.stringify(file) + '), first))\n' : '') +
                        'cat(' + JSON.stringify(name + ': passed\n') + ')\n').join('') + '})\n'
            });
            assert.equal(result.status, 0, result.stdout + result.stderr);
            process.stdout.write(result.stdout);
        }
        console.log('Export dialog controls, syntax and seven locales passed.');
    }
    finally {
        await h.browser.close();
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
