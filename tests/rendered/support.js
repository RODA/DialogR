'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { dialogForgeRoot } = require('../dialogforge');
const { buildPage, openPage, settle } = require(path.join(dialogForgeRoot, 'scripts/rendered-element-anchoring-acceptance'));
const playwright = require(path.join(dialogForgeRoot, 'node_modules/playwright'));
const root = path.resolve(__dirname, '../..');
const columns = ['id', 'age', 'group'];
const datasets = ['first', 'second'].map(name => ({ name, columns: columns.map(name => ({ name, numeric: name !== 'group', categorical: name === 'group', factor: name === 'group' })) }));
const workspaceData = {
    activeDataset: 'first',
    dataframe: Object.fromEntries(datasets.map(dataset => [dataset.name, {
        colnames: columns, numeric: [true, true, false], factor: [false, false, true], categorical: [false, false, true], any: [true, true, true]
    }]))
};

function source(id) {
    const file = path.join(root, 'dialogs/r', id, 'dialog.json');
    const document = JSON.parse(fs.readFileSync(file, 'utf8'));
    document.customJS = fs.readFileSync(path.join(path.dirname(file), document.script.entry), 'utf8');
    return document;
}

async function createHarness(browserName = 'chromium') {
    const plugins = process.env.DIALOGR_TEST_RADIO_REGRESSION === '1' ? [{
        name: 'restore-missing-radio-group-regression',
        setup(build) {
            build.onLoad({ filter: /dialogCanonicalControlAdapter\.ts$/ }, args => ({
                contents: fs.readFileSync(args.path, 'utf8').replaceAll('spec.radioGroup || spec.group', 'spec.group'),
                loader: 'ts'
            }));
        }
    }] : process.env.DIALOGR_TEST_SELECTION_REGRESSION === '1' ? [{
        name: 'restore-scripted-selection-events',
        setup(build) {
            build.onLoad({ filter: /customJSRuntime\.ts$/ }, args => ({
                contents: fs.readFileSync(args.path, 'utf8').replace(
                    'const initializing = obj.initialize;\n        obj.initialize = true;',
                    'const initializing = obj.initialize;\n        obj.initialize = initializing;'
                ),
                loader: 'ts'
            }));
        }
    }] : [];
    const bundle = await buildPage([
        'import { createDialogExternalCallHost } from "./src/dialog-runtime/custom-js/externalCallHost";',
        'window.createReleaseExternalHost = createDialogExternalCallHost;'
    ], { plugins });
    const browser = await playwright[browserName].launch({ headless: true });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    const frame = await openPage(page, bundle);
    await frame.evaluate(datasets => {
        const host = window.elementAnchorHost;
        host.datasets = datasets;
        const external = window.createReleaseExternalHost({ resolveDatasets: () => host.datasets });
        host.commands = [];
        host.syntax = '';
        const send = window.dialogForge.dialogRuntime.sendTo;
        window.dialogForge.dialogRuntime.sendTo = (target, channel, ...args) => {
            if (channel === 'dialogCommandUpdate') host.syntax = args[0];
            return send(target, channel, ...args);
        };
        window.dialogForge.dialogRuntime.invoke = async (channel, ...args) => {
            if (channel === 'datasetEditor:getActiveState' || channel === 'datasetEditor:consumeGoToContext') {
                return { datasetName: 'first', mode: 'variable' };
            }
            if (channel === 'base-app:callDialogExternal') {
                if (args[0] === 'getDatasetEditorState' || args[0] === 'consumeGoToContext') {
                    return { status: 'ready', name: args[0], value: { datasetName: 'first', mode: 'variable' } };
                }
                if (!external.supports(args[0])) throw new Error('Unsupported test host external: ' + args[0]);
                return external.call(args[0], args[1]);
            }
            if (channel === 'dialog:runVisibleCommand') {
                host.commands.push(args[0].command);
                return { ok: true, status: 'ok', command: args[0].command };
            }
            throw new Error('Unsupported test host channel: ' + channel);
        };
    }, datasets);
    const control = name => frame.locator(`.element-wrapper[data-nameid="${name}"]`);
    const choose = async (name, value) => {
        const row = control(name).locator('.container-item').filter({ has: frame.getByText(value, { exact: true }) });
        if (!await row.evaluate(node => node.classList.contains('active'))) await row.click();
        await settle(frame);
    };
    return {
        browser, page, frame, errors, control, choose,
        async load(id, locale = 'en_US', extras = {}) {
            errors.length = 0;
            await frame.evaluate(async ({ document, locale, extras, workspaceData, datasets }) => {
                window.elementAnchorHost.commands = [];
                window.elementAnchorHost.datasets = extras.datasets || datasets;
                await window.elementAnchorHost.deliver(document, locale, { workspaceData, ...extras });
            }, { document: source(id), locale, extras, workspaceData, datasets });
            await settle(frame);
            assert.deepEqual(errors, [], `${id}/${locale} runtime errors`);
        },
        async click(name) {
            const target = control(name).locator('.smart-button, .custom-checkbox, .custom-radio').first();
            assert.equal(await target.evaluate(node => Boolean(node.closest('.disabled-div,[aria-disabled="true"]'))), false, `${name} is disabled`);
            await target.click();
            await settle(frame);
        },
        async fill(name, value) { await control(name).locator('input:not([type="radio"]),textarea').fill(value); await control(name).locator('input:not([type="radio"]),textarea').blur(); await settle(frame); },
        async syntax() { return frame.evaluate(() => window.elementAnchorHost.syntax); },
        async commands() { return frame.evaluate(() => window.elementAnchorHost.commands); },
        async assertClean() { assert.deepEqual(errors, []); assert.deepEqual(await frame.evaluate(() => window.elementAnchorHost.errors), []); }
    };
}

module.exports = { root, dialogForgeRoot, source, createHarness, workspaceData, settle, assert, fs, path };
