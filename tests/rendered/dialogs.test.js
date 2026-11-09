'use strict';
const { root, source, createHarness, settle, assert, fs, path } = require('./support');

async function main() {
    const browserName = process.env.DIALOGR_TEST_BROWSER || 'chromium';
    const reportDir = path.resolve(root, 'artifacts/dialog-release', process.env.DIALOGR_TEST_RADIO_REGRESSION ? 'radio-regression' : browserName);
    fs.mkdirSync(reportDir, { recursive: true });
    fs.rmSync(path.join(reportDir, 'failure.png'), { force: true });
    const report = { browser: browserName, status: 'running', cases: [] };
    const h = await createHarness(browserName);
    try {
        let registered = JSON.parse(fs.readFileSync(path.join(root, 'dialogs/dialogs.json')));
        if (process.env.DIALOGR_TEST_RADIO_REGRESSION) registered = registered.filter(dialog => dialog.id === 'recode');
        for (const dialog of registered) {
            for (const locale of Object.keys(source(dialog.id).i18n.locales)) {
                await h.load(dialog.id, locale);
                for (const datasetName of ['c_datasets', 'dataset1', 'dataset2']) {
                    if (await h.control(datasetName).count()) {
                        assert.equal(await h.control(datasetName).locator('.container-item').count(), 2, `${dialog.id}/${locale}/${datasetName} workspace binding`);
                    }
                }
                if (await h.control('b_reset').count()) {
                    await h.click('b_reset');
                    await h.assertClean();
                }
                report.cases.push({ dialog: dialog.id, locale, kind: 'startup-reset', status: 'passed' });
            }
        }
        for (const dialog of registered) {
            await h.load(dialog.id, 'en_US', { datasets: [], workspaceData: { dataframe: {}, activeDataset: '' } });
            for (const name of ['c_datasets', 'dataset1', 'dataset2']) {
                if (await h.control(name).count()) assert.equal(await h.control(name).locator('.container-item').count(), 0);
            }
            await h.assertClean();
            report.cases.push({ dialog: dialog.id, kind: 'empty-workspace', status: 'passed' });
        }
        await h.load('recode');
        await h.click('b_run');
        assert.equal((await h.commands()).length, 0, 'No variable means no submitted command');
        await h.choose('c_datasets', 'first');
        assert.equal(await h.control('c_variables').locator('.container-item').count(), 3);
        await h.choose('c_variables', 'age');
        await h.click('b_run');
        assert.equal((await h.commands()).length, 0, 'No rules means no submitted command');
        await h.click('r_old6');
        await h.click('r_new3');
        await h.click('b_add');
        assert.match(await h.syntax(), /rules = "else=copy"/);
        await h.choose('c_rules', 'else=copy');
        await h.click('b_remove');
        assert.equal(await h.control('c_rules').locator('.container-item').count(), 0);
        await h.fill('i_value_old', '1');
        await h.fill('i_value_new', '9');
        await h.click('b_add');
        assert.match(await h.syntax(), /rules = "1=9"/);
        await h.click('b_run');
        assert.equal((await h.commands()).length, 1);
        report.cases.push({ dialog: 'recode', kind: 'radios-input-rules-run', status: 'passed' });
        await h.click('b_reset');
        assert.equal(await h.control('c_rules').locator('.container-item').count(), 0);
        await h.choose('c_datasets', 'second');
        assert.equal(await h.control('c_variables').locator('.container-item').count(), 3);
        await h.frame.evaluate(async () => {
            window.elementAnchorHost.datasets = [{ name: 'second', columns: ['id', 'age', 'group'] }];
            await window.elementAnchorHost.updateWorkspace({ dataframe: { second: { colnames: ['id', 'age', 'group'], any: [true,true,true] } }, activeDataset: 'second' });
        });
        await settle(h.frame);
        assert.deepEqual(await h.control('c_datasets').locator('.container-text').allTextContents(), ['second']);
        await h.assertClean();
        report.cases.push({ dialog: 'recode', kind: 'workspace-removal-refresh', status: 'passed' });
        await h.page.screenshot({ path: path.join(reportDir, 'recode.png') });
        report.status = 'passed';
        console.log(`Rendered DialogR ${browserName}: ${report.cases.length} cases passed.`);
    } catch (error) {
        report.status = 'failed'; report.failure = error.stack;
        await h.page.screenshot({ path: path.join(reportDir, 'failure.png') }).catch(() => {});
        throw error;
    } finally {
        fs.writeFileSync(path.join(reportDir, 'report.json'), JSON.stringify(report, null, 4) + '\n');
        await h.browser.close();
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
