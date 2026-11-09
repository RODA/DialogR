'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn, spawnSync } = require('node:child_process');
const { dialogForgeRoot } = require('../dialogforge');
const { chromium, _electron } = require(path.join(dialogForgeRoot, 'node_modules/playwright'));
const { findMainWindowPage, closeTestApplication } = require(path.join(dialogForgeRoot, 'tests/electron/product-launch'));
const root = path.resolve(__dirname, '../..');
const host = process.argv.includes('--web') ? 'webr' : 'native';
const output = path.join(root, 'artifacts/dialog-release', host);
const menu = JSON.parse(fs.readFileSync(path.join(root, 'menu/menu.json')));
function menuPath(items, id, parents = []) {
    for (const item of items) {
        if (item.dialog === id) return [...parents, item];
        const found = menuPath(item.items || [], id, [...parents, item]);
        if (found) return found;
    }
}
async function main() {
    fs.mkdirSync(output, { recursive: true });
    fs.rmSync(path.join(output, 'failure.png'), { force: true });
    const report = { host, status: 'running', cases: [] };
    const errors = [];
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'dialogr-release-'));
    let app, browser, server, page;
    try {
        if (host === 'native') {
            const rBinary = require('../../scripts/check-release-r').checkReleaseR();
            const nativeDist = path.resolve(process.env.DIALOGFORGE_DIST_DIR || path.join(dialogForgeRoot, 'dist'));
            report.nativeDist = nativeDist;
            report.rBinary = rBinary;
            const nativeEnv = {
                ...process.env,
                DIALOGFORGE_R_BINARY: rBinary,
                DIALOGFORGE_SOURCE_ROOT: dialogForgeRoot,
                DIALOGFORGE_DIST_DIR: nativeDist
            };
            const staged = spawnSync(process.execPath, [path.join(nativeDist, 'scripts/package-product.js'), '--product-path', root, '--stage-only'], { cwd: dialogForgeRoot, env: nativeEnv, stdio: 'inherit' });
            assert.equal(staged.status, 0, 'Stage the exact product under test');
            const coldStartup = spawnSync(process.execPath, [path.join(dialogForgeRoot, 'scripts/check-native-cold-startup.js')], { cwd: dialogForgeRoot, env: nativeEnv, stdio: 'inherit' });
            assert.equal(coldStartup.status, 0, 'Uncached native startup must survive the former deadline');
            app = await _electron.launch({ executablePath: require(path.join(dialogForgeRoot, 'node_modules/electron')), args: [...(process.platform === 'win32' ? ['--disable-gpu'] : []), path.join(nativeDist, 'scripts/electron-main.js'), '--product-path', root], cwd: dialogForgeRoot, env: { ...nativeEnv, DIALOGFORGE_TEST_USER_DATA_PATH: profile } });
            app.on('window', candidate => { candidate.on('pageerror', error => errors.push(error.message)); candidate.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); }); });
            page = await findMainWindowPage(app);
        } else {
            const web = path.resolve(process.env.DIALOGR_WEB_DIST || path.join(root, 'dist/web'));
            const port = await new Promise((resolve, reject) => {
                const listener = net.createServer(); listener.on('error', reject);
                listener.listen(0, '127.0.0.1', () => { const port = listener.address().port; listener.close(() => resolve(port)); });
            });
            server = spawn(process.execPath, [path.join(web, 'scripts/web-product-dev-server.js'), '--product-path', root, '--host', '127.0.0.1', '--port', String(port)], { cwd: web, env: { ...process.env, DIALOGFORGE_SOURCE_ROOT: dialogForgeRoot, DIALOGFORGE_DIST_DIR: web, DIALOGFORGE_WEB_PRODUCT_PATH: root }, stdio: ['ignore', 'pipe', 'pipe'] });
            let logs = '';
            const url = await new Promise((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error('Web server startup timed out: ' + logs)), 30000);
                server.on('exit', code => { clearTimeout(timer); reject(new Error('Web server exited: ' + code + logs)); });
                const read = chunk => { logs += chunk; const match = logs.match(/http:\/\/127\.0\.0\.1:(\d+)\//); if (match) { clearTimeout(timer); resolve(match[0]); } };
                server.stdout.on('data', read); server.stderr.on('data', read);
            });
            browser = await chromium.launch();
            page = await browser.newPage();
            page.on('pageerror', error => errors.push(error.message));
            page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
            await page.goto(url);
        }
        page.setDefaultTimeout(30000);
        await page.waitForFunction(() => window.monaco?.editor?.getEditors?.().some(editor => editor.getDomNode()?.closest('#consoleTerminal')), null, { timeout: 120000 });
        await page.waitForFunction(() => {
            return document.getElementById('consoleStatus')?.textContent.includes(' - failed') ||
                Array.from(document.querySelectorAll('[data-session-phase="ready"]')).some(el => el.dataset.runtimeBusy !== 'true');
        }, null, { timeout: 120000 });
        if (await page.evaluate(() => document.getElementById('consoleStatus')?.textContent.includes(' - failed'))) {
            throw new Error('Runtime startup failed: ' + await page.locator('body').innerText());
        }
        const run = async code => {
            await page.waitForFunction(() => {
                const input = document.getElementById('visibleCommandInput');
                return input?.dialogForgeConsoleInputView?.setText &&
                    Array.from(document.querySelectorAll('[data-session-phase="ready"]')).some(node => node.dataset.runtimeBusy !== 'true');
            });
            // Use the shared console control's public operations for assertions;
            // keyboard/clipboard fidelity is covered by production console parity.
            await page.evaluate(async text => {
                const view = document.getElementById('visibleCommandInput').dialogForgeConsoleInputView;
                view.setText(text);
                await view.submit();
            }, code);
        };
        const expectR = async (code, label) => {
            const marker = `DIALOGR_RELEASE_${report.cases.length}_PASS`;
            await run(`${code}; cat("${marker}\\n")`);
            await page.getByText(marker, { exact: true }).last().waitFor();
            report.cases.push({ name: label, status: 'passed' });
        };
        await run('first <- data.frame(id=c(3,1,2), age=c(30,10,20), group=c("a","b","c")); second <- data.frame(id=c(1,2,4), bonus=c(100,200,400)); short <- data.frame(extra=99)');
        const open = async id => {
            if (app) {
                const wait = app.waitForEvent('window');
                await app.evaluate(({ Menu }, id) => { const item = Menu.getApplicationMenu().getMenuItemById(id); if (!item?.enabled) throw new Error('Disabled menu ' + id); item.click(); }, menuPath(menu, id).at(-1).id);
                const dialog = await wait;
                dialog.setDefaultTimeout(30000);
                await dialog.locator('#paper [data-control-name]').first().waitFor();
                return { frame: dialog, close: () => dialog.close() };
            }
            const composition = await page.evaluate(async () => (await fetch('/api/composition')).json());
            const entries = menuPath(composition.menu, id);
            await page.locator('.web-menu-button').filter({ hasText: entries[0].label }).click();
            for (const entry of entries.slice(1, -1)) await page.locator('.web-menu-item:visible').filter({ hasText: entry.label }).hover();
            await page.locator('.web-menu-item:visible').filter({ hasText: entries.at(-1).label }).click();
            const layer = page.locator(`.dialogforge-web-dialog-layer[data-dialog-id="${id}"]`);
            await layer.waitFor();
            const frame = page.frameLocator(`.dialogforge-web-dialog-layer[data-dialog-id="${id}"] iframe`);
            await frame.locator('#paper [data-control-name]').first().waitFor();
            return { frame, close: () => layer.locator('.dialogforge-web-dialog__close').click() };
        };
        const control = (frame, name) => frame.locator(`[data-control-name="${name}"]`).first();
        const choose = async (frame, name, value) => {
            const row = control(frame, name).locator('.container-item').filter({ has: frame.getByText(value, { exact: true }) });
            await row.waitFor();
            if (!await row.evaluate(node => node.classList.contains('active'))) await row.click();
        };
        const click = async (frame, name) => control(frame, name).locator('.smart-button,.custom-checkbox,.custom-radio').first().click();
        const fill = async (frame, name, value) => { const input = control(frame, name).locator('textarea,input:not([type="radio"])'); await input.fill(value); await input.press('Tab'); };
        const submit = async (dialog, id) => {
            const completed = app
                ? dialog.frame.waitForEvent('close', { timeout: 30000 })
                : page.locator(`.dialogforge-web-dialog-layer[data-dialog-id="${id}"]`).waitFor({ state: 'hidden', timeout: 30000 });
            await click(dialog.frame, 'b_run');
            await completed;
        };
        let dialog = await open('recode');
        await choose(dialog.frame, 'c_datasets', 'first');
        await choose(dialog.frame, 'c_variables', 'age');
        await click(dialog.frame, 'b_run');
        await dialog.frame.locator('[data-control-name="c_rules"].error-in-field,[data-control-name="c_rules"] .error-in-field').waitFor();
        await click(dialog.frame, 'r_old6'); await click(dialog.frame, 'r_new3'); await click(dialog.frame, 'b_add');
        await control(dialog.frame, 'c_rules').getByText('else=copy', { exact: true }).waitFor();
        await click(dialog.frame, 'b_reset');
        assert.equal(await control(dialog.frame, 'c_rules').locator('.container-item').count(), 0);
        await choose(dialog.frame, 'c_datasets', 'first'); await choose(dialog.frame, 'c_variables', 'age');
        await fill(dialog.frame, 'i_value_old', '10'); await fill(dialog.frame, 'i_value_new', '11'); await click(dialog.frame, 'b_add');
        await control(dialog.frame, 'c_rules').getByText('10=11', { exact: true }).waitFor();
        await click(dialog.frame, 'r_old6'); await click(dialog.frame, 'r_new3'); await click(dialog.frame, 'b_add');
        await submit(dialog, 'recode');
        await expectR('stopifnot(identical(first$age,c(30,11,20)))', 'Recode commits exact values');
        dialog = await open('addvariables');
        assert.equal(await control(dialog.frame, 'dataset1').locator('.active').count(), 0);
        await choose(dialog.frame, 'dataset1', 'first'); await choose(dialog.frame, 'dataset2', 'short');
        await click(dialog.frame, 'by_order'); await click(dialog.frame, 'new_dataset'); await fill(dialog.frame, 'newdataset', 'padded');
        await submit(dialog, 'addvariables');
        await expectR('stopifnot(nrow(padded)==3, identical(padded$id,c(3,1,2)), identical(padded$extra,c(99,NA_real_,NA_real_)))', 'Row order pads with NA without recycling');
        dialog = await open('addvariables'); await click(dialog.frame, 'b_reset');
        await choose(dialog.frame, 'dataset1', 'first'); await choose(dialog.frame, 'dataset2', 'second'); await choose(dialog.frame, 'c_keys', 'id');
        await click(dialog.frame, 'lookup2'); await click(dialog.frame, 'new_dataset'); await fill(dialog.frame, 'newdataset', 'joined'); await submit(dialog, 'addvariables');
        await expectR('stopifnot(identical(joined$id,c(1,2,3)), identical(joined$bonus,c(100,200,NA_real_)), identical(first$id,c(3,1,2)))', 'Key lookup preserves case data and source');
        dialog = await open('addcases'); await click(dialog.frame, 'b_reset');
        await choose(dialog.frame, 'dataset1', 'first'); await choose(dialog.frame, 'dataset2', 'second');
        await submit(dialog, 'addcases');
        await expectR('stopifnot(nrow(first)==6, identical(names(first),c("id","age","group")), all(is.na(first$age[4:6])), identical(second$bonus,c(100,200,400)))', 'Add cases retains first schema and pads absent columns');
        if (host === 'webr') {
            const { unzipSync } = require(path.join(dialogForgeRoot, 'node_modules/fflate'));
            const checkArchive = (bytes, expectedNames) => {
                const files = unzipSync(bytes);
                assert.deepEqual(Object.keys(files).sort(), [...expectedNames].sort());
                for (const file of Object.values(files)) assert.ok(file.byteLength > 0);
                if (files['data.sas']) {
                    const script = Buffer.from(files['data.sas']).toString('utf8');
                    assert.match(script, /^libname datadir "\.";\r?$/im);
                    assert.match(script, /PROC FORMAT/i);
                }
                return files;
            };
            await expectR('stopifnot(packageVersion("declared") >= "0.28", packageVersion("DDIwR") >= "0.24"); dir.create("export-check"); setwd("export-check"); export_fixture <- data.frame(id=1:3, answer=declared::declared(c(1,9,2), label="Answer", labels=c(Yes=1,Missing=9,No=2), na_values=9))', 'Updated VFS packages load and the export fixture is ready');
            const cases = [
                { format: 'R (.rds)', files: ['data.rds'], verify: 'stopifnot(identical(readRDS("data.rds"), export_fixture))' },
                { format: 'SPSS (.sav / .zsav)', files: ['data.zsav'], toggle: 'spss_zsav' },
                { format: 'Stata (.dta)', files: ['data.dta'], command: 'convert(export_fixture, to = "data.dta")' },
                { format: 'Stata (.dta)', files: ['data.dta'], select: ['version', '13'] },
                {
                    format: 'Stata (.dta)', files: ['data.dta'],
                    setup: 'attr(export_fixture, "stata_metadata") <- list(version=13L)',
                    command: 'convert(export_fixture, to = "data.dta", version = 14)',
                    verify: 'stopifnot(attr(DDIwR::convert("data.dta", declared=FALSE), "stata_metadata")$version == 14)',
                    label: 'Stata 14 overrides an imported Stata 13 version'
                },
                {
                    format: 'SAS (.sas7bdat)', files: ['data.sas7bdat', 'data.sas7bcat'],
                    command: 'convert(export_fixture, to = "data.sas7bdat")',
                    verify: 'stopifnot(all(c("Yes", "No") %in% names(attr(convert("data.sas7bdat", recode=FALSE)$answer, "labels"))))'
                },
                {
                    format: 'SAS (.sas7bdat)', files: ['data.sas7bdat'], toggle: 'catalog',
                    setup: 'catalog_before <- tools::md5sum("data.sas7bcat")',
                    command: 'convert(export_fixture, to = "data.sas7bdat", catalog = NULL)',
                    verify: 'stopifnot(identical(tools::md5sum("data.sas7bcat"), catalog_before), is.null(attr(convert("data.sas7bdat", catalog=NULL)$answer, "labels")))',
                    label: 'SAS catalog opt-out leaves the earlier catalog untouched and downloads only the dataset'
                },
                {
                    format: 'SAS (.sas7bdat)', files: ['data.sas7bdat', 'data.sas7bcat'],
                    label: 'Replacing a SAS export downloads the newly written catalog'
                },
                {
                    format: 'SAS Transport (.xpt)', files: ['data.xpt', 'data.sas'],
                    select: ['xpt_version', '8']
                },
                {
                    format: 'SAS Transport (.xpt)', files: ['data.xpt', 'data.sas'],
                    dataset: 'LF', setup: 'data(LF, package = "QCA")',
                    command: 'convert(LF, to = "data.xpt")',
                    verify: 'stopifnot(nrow(convert("data.xpt", declared=FALSE, recode=FALSE)) == nrow(LF))',
                    label: 'QCA LF exports as a local ZIP with its transport data and setup script'
                },
                {
                    format: 'SAS Transport (.xpt)', files: ['data.xpt'], toggle: 'xpt_setup',
                    setup: 'writeLines("earlier script", "data.sas")',
                    command: 'convert(export_fixture, to = "data.xpt", setup = FALSE)',
                    verify: 'stopifnot(identical(readLines("data.sas"), "earlier script"))',
                    label: 'XPT setup opt-out leaves the earlier script untouched and downloads only the dataset'
                },
                { format: 'Excel (.xlsx)', files: ['data.xlsx'] },
                { format: 'DDI (.xml)', files: ['data.xml', 'data.csv'], toggle: 'ddi_csv' },
                {
                    format: 'SAS Transport (.xpt)', files: ['data.xpt'],
                    setup: 'stopifnot(file.exists("data.sas")); export_fixture$answer <- c(1,9,2)',
                    command: 'convert(export_fixture, to = "data.xpt")',
                    label: 'Unlabelled XPT exports without downloading the previous SAS script'
                },
                {
                    format: 'SAS (.sas7bdat)', files: ['data.sas7bdat'],
                    label: 'Unlabelled SAS exports without downloading the previous catalog'
                }
            ];
            for (const test of cases) {
                if (test.setup) {
                    await run(test.setup);
                }
                dialog = await open('exportdata');
                await choose(dialog.frame, 'c_datasets', test.dataset || 'export_fixture');
                await control(dialog.frame, 'format').locator('select').selectOption(test.format);
                if (test.select) {
                    await control(dialog.frame, test.select[0]).locator('select').selectOption(test.select[1]);
                }
                if (test.toggle) {
                    await click(dialog.frame, test.toggle);
                }
                if (test.command) {
                    await page.waitForFunction(command => document.getElementById('command')?.textContent.trim() === command,
                        test.command, { timeout: 5000 });
                }
                const downloads = [];
                const collect = download => downloads.push(download);
                page.on('download', collect);
                try {
                    await submit(dialog, 'exportdata');
                    const archive = test.files.length > 1;
                    const name = archive ? test.files[0].replace(/\.[^.]+$/, '.zip') : test.files[0];
                    const end = Date.now() + 5000;
                    while (!downloads.length && Date.now() < end) {
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
                    assert.deepEqual(downloads.map(download => download.suggestedFilename()), [name]);
                    const bytes = fs.readFileSync(await downloads[0].path());
                    assert.ok(bytes.byteLength > 0, name);
                    if (archive) {
                        const files = checkArchive(bytes, test.files);
                        if (test.dataset === 'LF') {
                            assert.match(Buffer.from(files['data.sas']).toString('utf8'), /Undeveloped/);
                            await page.getByText(test.command, { exact: true }).last().waitFor();
                        }
                    }
                } finally {
                    page.off('download', collect);
                }
                const verify = test.verify || `stopifnot(identical(as.numeric(DDIwR::convert(${JSON.stringify(test.files[0])}, declared=FALSE, recode=FALSE)$id), c(1,2,3)))`;
                const runtimeFiles = test.files.map(name => JSON.stringify(name));
                await expectR(`stopifnot(all(file.exists(c(${runtimeFiles.join(', ')})))); ${verify}`, test.label || `${test.format} downloads and round trips from the R working directory`);
            }

            // Stand in for the OS picker and verify the real app writes through its handle.
            await page.evaluate(() => {
                window.exportPicker = { cancel: true, calls: [], bytes: 0, closed: false, name: 'browser-picked.rds' };
                window.showSaveFilePicker = async options => {
                    const picker = window.exportPicker;
                    picker.calls.push({ suggestedName: options.suggestedName, activated: navigator.userActivation.isActive });
                    if (picker.cancel) {
                        throw new DOMException('Canceled', 'AbortError');
                    }
                    return {
                        name: picker.name,
                        async createWritable() {
                            return {
                                async write(bytes) {
                                    picker.bytes = bytes.byteLength;
                                    if (picker.name.endsWith('.zip')) picker.archive = Array.from(bytes);
                                },
                                async close() { picker.closed = true; }
                            };
                        }
                    };
                };
            });
            const waitForDestination = name => page.waitForFunction(name => {
                const frame = document.querySelector('.dialogforge-web-dialog-layer[data-dialog-id="exportdata"] iframe');
                const field = frame?.contentDocument?.querySelector('[data-control-name="filename"] textarea, [data-control-name="filename"] input');
                return field?.value === name;
            }, name, { timeout: 5000 });
            dialog = await open('exportdata');
            await choose(dialog.frame, 'c_datasets', 'export_fixture');
            await control(dialog.frame, 'format').locator('select').selectOption('R (.rds)');
            const destination = control(dialog.frame, 'filename').locator('input,textarea');
            await click(dialog.frame, 'b_browse');
            await page.waitForFunction(() => window.exportPicker.calls.length === 1);
            assert.equal(await destination.inputValue(), 'data.rds');
            await page.evaluate(() => { window.exportPicker.cancel = false; });
            await click(dialog.frame, 'b_browse');
            await waitForDestination('browser-picked.rds');
            assert.equal(await page.evaluate(() => window.exportPicker.bytes), 0);
            await submit(dialog, 'exportdata');
            const picker = await page.evaluate(() => window.exportPicker);
            assert.deepEqual(picker.calls, [{ suggestedName: 'data.rds', activated: true }, { suggestedName: 'data.rds', activated: true }]);
            assert.ok(picker.bytes > 0 && picker.closed);
            await expectR('stopifnot(identical(readRDS("browser-picked.rds"), export_fixture))', 'Browse cancels cleanly and Export writes the selected browser file');

            await page.evaluate(() => {
                window.exportPicker.name = 'My SAS export.zip';
                window.exportPicker.closed = false;
            });
            dialog = await open('exportdata');
            await choose(dialog.frame, 'c_datasets', 'LF');
            await control(dialog.frame, 'format').locator('select').selectOption('SAS Transport (.xpt)');
            await click(dialog.frame, 'b_browse');
            await page.waitForFunction(() => window.exportPicker.calls.length === 3);
            await submit(dialog, 'exportdata');
            const zipPicker = await page.evaluate(() => window.exportPicker);
            assert.deepEqual(zipPicker.calls.at(-1), { suggestedName: 'data.zip', activated: true });
            assert.ok(zipPicker.closed);
            checkArchive(Uint8Array.from(zipPicker.archive), ['data.xpt', 'data.sas']);
            report.cases.push({ name: 'Browse writes the ZIP to the chosen local file handle', status: 'passed' });

            await page.evaluate(() => {
                window.exportPicker.name = 'browser-abandoned.rds';
                window.exportPicker.bytes = 0;
            });
            dialog = await open('exportdata');
            await control(dialog.frame, 'format').locator('select').selectOption('R (.rds)');
            await click(dialog.frame, 'b_browse');
            await waitForDestination('browser-abandoned.rds');
            await dialog.close();
            dialog = await open('exportdata');
            await choose(dialog.frame, 'c_datasets', 'export_fixture');
            await control(dialog.frame, 'format').locator('select').selectOption('R (.rds)');
            await fill(dialog.frame, 'filename', 'browser-abandoned.rds');
            const downloaded = page.waitForEvent('download');
            await submit(dialog, 'exportdata');
            assert.equal((await downloaded).suggestedFilename(), 'browser-abandoned.rds');
            assert.equal(await page.evaluate(() => window.exportPicker.bytes), 0);
            await expectR('stopifnot(identical(readRDS("browser-abandoned.rds"), export_fixture))', 'A later export cannot reuse an abandoned Browse destination');
        }
        assert.deepEqual(errors, [], 'Application must not emit renderer errors');
        await page.screenshot({ path: path.join(output, 'completed.png') });
        report.status = 'passed';
        console.log(`${host} application dialogs passed (${report.cases.length} R assertions).`);
    } catch (error) {
        report.status = 'failed'; report.failure = error.stack; report.errors = errors;
        if (page && !page.isClosed()) await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
        throw error;
    } finally {
        if (app && !await closeTestApplication(app, 10000)) {
            report.status = 'failed';
            report.cleanupError = 'Native test instance did not close normally';
            process.exitCode = 1;
        }
        if (browser) await browser.close();
        if (server) { server.stdout.destroy(); server.stderr.destroy(); server.kill('SIGTERM'); }
        fs.rmSync(profile, { recursive: true, force: true });
        fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 4) + '\n');
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
