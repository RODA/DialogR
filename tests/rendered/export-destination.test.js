'use strict';
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { createHarness, dialogForgeRoot, path, fs, assert, settle } = require('./support');
const esbuild = require(path.join(dialogForgeRoot, 'node_modules/esbuild'));

async function main() {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dialogr-export-destination-'));
    const chosen = path.join(directory, 'chosen folder', 'survey "quoted".rds');
    fs.mkdirSync(path.dirname(chosen));
    let pickerCalls = 0, replacement = 0, cancelPicker = false, confirmations = 0, commands = 0;
    const electron = {
        BrowserWindow: { getFocusedWindow: () => null },
        dialog: {
            async showSaveDialog() { pickerCalls++; return { canceled: cancelPicker, filePath: chosen }; },
            async showMessageBox() { confirmations++; return { response: replacement }; }
        }
    };
    const bundle = await esbuild.build({
        stdin: { contents: 'export {createFileExportHost} from "./src/dialog-runtime/custom-js/fileExportHost"; export {createDesktopFileExportAdapter} from "./src/shell-electron/dialog-runtime/fileExportAdapter";', resolveDir: dialogForgeRoot },
        bundle: true, platform: 'node', format: 'cjs', external: ['electron'], write: false
    });
    const module = { exports: {} };
    new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(name => name === 'electron' ? electron : require(name), module, module.exports);
    const host = module.exports.createFileExportHost(module.exports.createDesktopFileExportAdapter());
    const h = await createHarness();
    try {
        await h.page.exposeFunction('nativeExportDestination', (name, parameters) => host.call(name, parameters));
        await h.page.exposeFunction('nativeExportCommand', command => {
            commands++;
            const result = spawnSync('Rscript', ['--vanilla', '-'], {
                cwd: directory, encoding: 'utf8', timeout: 30000,
                input: 'first <- data.frame(id=1:3, answer=c("yes","no","yes"))\n' + command
            });
            assert.equal(result.status, 0, result.stdout + result.stderr);
            return { ok: true, status: 'ok', command };
        });
        await h.frame.evaluate(workingDirectory => {
            const invoke = window.dialogForge.dialogRuntime.invoke;
            window.dialogForge.dialogRuntime.invoke = (channel, ...args) => {
                if (channel === 'dialog:getWorkingDirectory') return Promise.resolve(workingDirectory);
                if (channel === 'base-app:callDialogExternal' && /^(select|prepare|finish|cancel)ExportFile$/.test(args[0])) {
                    return window.nativeExportDestination(...args);
                }
                if (channel === 'dialog:runVisibleCommand') return window.nativeExportCommand(args[0].command);
                return invoke(channel, ...args);
            };
        }, directory);
        await h.load('exportdata');
        await h.choose('c_datasets', 'first');
        await h.control('format').locator('select').selectOption('R (.rds)');
        await settle(h.frame);
        assert.equal(await h.control('b_run').locator('.smart-button').innerText(), 'Export');
        await h.click('b_run');
        assert.equal(pickerCalls, 0, 'Export must not open a destination picker');
        assert.ok(fs.existsSync(path.join(directory, 'data.rds')), 'A bare filename uses R working directory');
        await h.click('b_browse');
        assert.equal(pickerCalls, 1);
        assert.equal(await h.control('filename').locator('input,textarea').inputValue(), chosen);
        assert.equal(fs.existsSync(chosen), false, 'Browse only selects a destination');
        await h.click('b_run');
        assert.equal(pickerCalls, 1);
        assert.ok(fs.existsSync(chosen));
        cancelPicker = true;
        await h.click('b_browse');
        assert.equal(await h.control('filename').locator('input,textarea').inputValue(), chosen, 'Cancel retains the destination');
        const before = commands;
        await h.click('b_run');
        assert.equal(commands, before, 'Cancel replacement does not run the export');
        assert.ok(confirmations > 0);
        replacement = 1;
        await h.click('b_run');
        assert.equal(commands, before + 1);
        const typed = path.join(directory, 'typed.rds');
        await h.fill('filename', typed);
        await h.click('b_run');
        assert.ok(fs.existsSync(typed));
        const verify = spawnSync('Rscript', ['--vanilla', '-'], {
            encoding: 'utf8', input: 'x <- readRDS(' + JSON.stringify(typed) + '); stopifnot(identical(x, data.frame(id=1:3, answer=c("yes","no","yes"))))'
        });
        assert.equal(verify.status, 0, verify.stderr);
        await h.page.screenshot({ path: path.join(__dirname, '../../artifacts/export-dialog/destination.png'), clip: { x: 0, y: 0, width: 525, height: 375 } });
        await h.assertClean();
        console.log('Rendered Browse, cancellation, typed paths, working-directory export and overwrite handling passed with native R output.');
    }
    finally {
        await h.browser.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
