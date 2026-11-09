'use strict';
const { spawnSync } = require('node:child_process');
const { root, source, createHarness, settle, assert, fs, path } = require('./support');

async function main() {
    const browser = process.env.DIALOGR_TEST_BROWSER || 'chromium';
    const output = path.join(root, 'artifacts/dialog-release/bivariate', browser);
    fs.mkdirSync(output, { recursive: true });
    const report = { browser, status: 'running', cases: [] };
    const h = await createHarness(browser);
    const runR = (command, assertion, setup = '') => {
        const result = spawnSync(process.env.RSCRIPT || 'Rscript', ['--vanilla', '-'], {
            input: 'library(admisc)\nfirst <- data.frame(id=c(1,2,3,4,5,NA,7), age=c(4,1,5,2,8,9,NA))\n' +
                setup + '\nresult <- ' + command + '\n' + assertion + '\n',
            encoding: 'utf8', timeout: 30000
        });
        if (result.error) throw result.error;
        assert.equal(result.status, 0, command + '\n' + result.stdout + '\n' + result.stderr);
    };
    const choosePair = async () => {
        await h.choose('c_datasets', 'first');
        await h.choose('c_variables', 'id');
        await h.choose('c_variables', 'age');
    };
    try {
        for (const locale of Object.keys(source('bivariate').i18n.locales)) {
            await h.load('bivariate', locale);
            await choosePair();
            await h.page.screenshot({ path: path.join(output, locale + '.png') });
            await h.click('b_reset');
            await h.assertClean();
            report.cases.push({ name: 'locale-reset-' + locale, status: 'passed' });
        }
        await h.load('bivariate');
        await h.click('b_run');
        assert.equal((await h.commands()).length, 0);
        await h.choose('c_datasets', 'first');
        // Categorical columns remain visible but cannot be selected as numeric variables.
        const group = h.control('c_variables').locator('.container-item').filter({ has: h.frame.getByText('group', { exact: true }) });
        assert.equal(await group.getAttribute('data-disabled'), 'true');
        await h.choose('c_variables', 'id');
        await h.click('b_run');
        assert.equal((await h.commands()).length, 0);
        assert.equal(await h.syntax(), '');
        await h.choose('c_variables', 'age');
        assert.match(await h.syntax(), /cor\.test\(id, age\)/);
        await h.control('c_variables').locator('.container-item').filter({ has: h.frame.getByText('age', { exact: true }) }).click();
        await settle(h.frame);
        assert.equal(await group.getAttribute('data-disabled'), 'true', 'Deselecting a variable must not enable categorical columns');
        await h.choose('c_variables', 'age');
        report.cases.push({ name: 'zero-and-one-variable-validation', status: 'passed' });

        for (const method of ['pearson', 'spearman', 'kendall']) {
            await h.click('r_' + method);
            assert.equal(await h.control('confidence').locator('input,textarea').isEnabled(), method === 'pearson');
            for (const [radio, alternative] of [['twosided', 'two.sided'], ['greater', 'greater'], ['less', 'less']]) {
                await h.click('r_' + radio);
                const command = await h.syntax();
                await h.click('b_run');
                assert.equal((await h.commands()).at(-1), command);
                runR(command, `expected <- cor.test(c(1,2,3,4,5), c(4,1,5,2,8), method="${method}", alternative="${alternative}")
                    stopifnot(inherits(result, "htest"), identical(result$estimate, expected$estimate),
                        identical(result$p.value, expected$p.value), identical(result$alternative, expected$alternative))`);
                report.cases.push({ name: method + '-' + alternative + '-complete-pairs', status: 'passed' });
            }
        }
        await h.click('r_pearson');
        await h.click('r_twosided');
        for (const value of ['', '0', '100', '101', '-1', 'abc', 'Inf']) {
            await h.fill('confidence', value);
            assert.equal(await h.syntax(), '');
            const count = (await h.commands()).length;
            await h.click('b_run');
            assert.equal((await h.commands()).length, count);
        }
        await h.fill('confidence', '99');
        assert.match(await h.syntax(), /conf.level = 0.99/);
        runR(await h.syntax(), 'stopifnot(attr(result$conf.int, "conf.level") == 0.99, result$parameter == 3)');
        // Declared user-missing values are excluded by the same complete-pairs path.
        runR(await h.syntax(), 'stopifnot(result$parameter == 3)',
            'first$id[6] <- 99; first$id <- declared::declared(first$id, na_values=99)');
        for (const method of ['spearman', 'kendall']) {
            await h.click('r_' + method);
            assert.doesNotMatch(await h.syntax(), /conf.level/);
            runR(await h.syntax(), `expected <- suppressWarnings(cor.test(first$id, first$age, method="${method}"))
                stopifnot(identical(result$estimate, expected$estimate), identical(result$p.value, expected$p.value))`,
                'first$id[2] <- 1');
        }
        report.cases.push({ name: 'confidence-declared-missing-and-rank-ties', status: 'passed' });

        await h.click('b_reset');
        assert.equal(await h.control('confidence').locator('input,textarea').inputValue(), '95');
        assert.equal(await h.control('confidence').locator('input,textarea').isEnabled(), true);
        assert.equal(await h.syntax(), '');
        await choosePair();
        assert.match(await h.syntax(), /cor\.test\(id, age\)/);

        const names = ['score X', 'if', 'tick`slash\\name'];
        const datasets = [{ name: 'survey data', columns: names.map(name => ({ name, numeric: true })) }];
        const workspaceData = { activeDataset: 'survey data', dataframe: { 'survey data': { colnames: names, numeric: [true,true,true], any: [true,true,true] } } };
        await h.load('bivariate', 'en_US', { datasets, workspaceData });
        await h.choose('c_datasets', 'survey data');
        const variableRow = name => h.control('c_variables').locator('.container-item').filter({ has: h.frame.getByText(name, { exact: true }) });
        await h.choose('c_variables', names[2]);
        const pinned = await variableRow(names[2]).boundingBox();
        const unselected = await variableRow(names[0]).boundingBox();
        assert.ok(pinned.y < unselected.y, 'The selected last variable must be pinned above unselected variables');
        await h.choose('c_variables', names[0]);
        assert.equal(await variableRow(names[1]).getAttribute('data-disabled'), 'true');
        const pairCommand = await h.syntax();
        // Click its screen position: a disabled row must ignore real pointer input.
        await variableRow(names[1]).click({ force: true });
        await settle(h.frame);
        assert.equal(await h.control('c_variables').locator('.container-item.active').count(), 2);
        assert.equal(await h.syntax(), pairCommand);
        // A workspace refresh must preserve the selection limit.
        await h.frame.evaluate(async workspaceData => {
            await window.elementAnchorHost.updateWorkspace(workspaceData);
        }, workspaceData);
        await settle(h.frame);
        assert.equal(await variableRow(names[1]).getAttribute('data-disabled'), 'true');
        await variableRow(names[2]).click();
        await settle(h.frame);
        assert.equal(await h.syntax(), '');
        assert.notEqual(await variableRow(names[1]).getAttribute('data-disabled'), 'true');
        await h.choose('c_variables', names[1]);
        assert.equal(await variableRow(names[2]).getAttribute('data-disabled'), 'true');
        await h.click('b_reset');
        for (const name of names) {
            assert.notEqual(await variableRow(name).getAttribute('data-disabled'), 'true');
        }
        await h.choose('c_variables', names[0]);
        report.cases.push({ name: 'pinned-pair-disables-others-until-deselection', status: 'passed' });
        for (const name of names.slice(1)) {
            await h.choose('c_variables', name);
            runR(await h.syntax(), 'stopifnot(inherits(result,"htest"), is.finite(result$p.value))',
                '`survey data` <- data.frame(first$id, first$age, first$age, check.names=FALSE)\nnames(`survey data`) <- c("score X", "if", "tick`slash\\\\name")');
            await variableRow(name).click();
            await settle(h.frame);
        }
        await h.frame.evaluate(async () => {
            window.elementAnchorHost.datasets = [];
            await window.elementAnchorHost.updateWorkspace({ dataframe: {}, activeDataset: '' });
        });
        await settle(h.frame);
        assert.equal(await h.syntax(), '');
        await h.click('b_run');
        assert.equal((await h.commands()).length, 0);
        await h.assertClean();
        report.cases.push({ name: 'reset-quoted-names-and-workspace-removal', status: 'passed' });
        report.status = 'passed';
        console.log(`Bivariate ${browser}: ${report.cases.length} rendered/R cases passed.`);
    } catch (error) {
        report.status = 'failed'; report.failure = error.stack;
        await h.page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
        throw error;
    } finally {
        fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 4) + '\n');
        await h.browser.close();
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
