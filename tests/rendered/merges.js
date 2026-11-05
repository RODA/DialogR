'use strict';
const { spawnSync } = require('node:child_process');
const { root, createHarness, assert, fs, path } = require('./support');
const preamble = 'library(admisc)\nfirst <- data.frame(id=c(3,1,2), age=c(30,10,20), group=c("a","b","c"))\nsecond <- data.frame(id=c(1,2,4), bonus=c(100,200,400))\nshort <- data.frame(extra=99)\nempty <- short[FALSE,,drop=FALSE]\nempty2 <- data.frame(other=logical())\nrows <- first\n';
const definitions = { first: ['id','age','group'], second: ['id','bonus'], short: ['extra'], empty: ['extra'], empty2: ['other'], rows: ['id','age','group'] };
const extras = {
    datasets: Object.entries(definitions).map(([name, columns]) => ({ name, columns })),
    workspaceData: { dataframe: Object.fromEntries(Object.entries(definitions).map(([name, colnames]) => [name, { colnames, any: colnames.map(() => true) }])) }
};
async function main() {
    require('../../scripts/check-release-r').checkReleaseR();
    const h = await createHarness(process.env.DIALOGR_TEST_BROWSER || 'chromium');
    const output = path.join(root, process.env.DIALOGR_TEST_SELECTION_REGRESSION ? 'artifacts/dialog-release/selection-regression' : 'artifacts/dialog-release/merges'); fs.mkdirSync(output, { recursive: true });
    fs.rmSync(path.join(output, 'failure.png'), { force: true });
    const report = { status: 'running', cases: [] };
    async function start(id = 'addvariables', x = 'first', y = 'second') {
        await h.load(id, 'en_US', extras);
        assert.equal(await h.control('dataset1').locator('.active').count(), 0);
        assert.equal(await h.control('dataset2').locator('.active').count(), 0);
        await h.choose('dataset1', x);
        const blocked = h.control('dataset2').locator('.container-item').filter({ has: h.frame.getByText(x, { exact: true }) });
        assert.equal(await blocked.evaluate(node => node.dataset.disabled), 'true', 'Selected source is blocked in the other selector');
        await h.choose('dataset2', y);
    }
    async function target(id = 'addvariables') {
        await h.click(id === 'addcases' ? 'checkbox1' : 'new_dataset');
        await h.fill('newdataset', 'combined');
    }
    async function execute(name, assertion, before = '') {
        const command = await h.syntax();
        assert.ok(command.trim(), `${name}: syntax must exist`);
        await h.click('b_run');
        assert.equal((await h.commands()).at(-1), command, `${name}: preview and submitted command must match`);
        const r = spawnSync(process.env.RSCRIPT || 'Rscript', ['--vanilla', '-'], { input: preamble + before + '\n' + command + '\n' + assertion + '\nstopifnot(is.data.frame(rows), nrow(rows)==3)' + '\n', encoding: 'utf8', timeout: 30000 });
        if (r.error) throw r.error;
        assert.equal(r.status, 0, `${name}: R failed\n${command}\n${r.stdout}\n${r.stderr}`);
        await h.assertClean();
        report.cases.push({ name, command, status: 'passed' });
    }
    try {
        await start(); await target(); await h.choose('c_keys','id');
        assert.equal(await h.control('c_excluded').locator('.container-item').filter({has:h.frame.getByText('(1) id',{exact:true})}).evaluate(node=>node.dataset.disabled), 'true');
        await execute('inner-key-merge','stopifnot(identical(combined$id,c(1,2)), identical(combined$age,c(10,20)))');
        await start(); await target(); await h.choose('c_keys','id'); await h.click('lookup2');
        await execute('second-lookup','stopifnot(identical(combined$id,c(1,2,3)), identical(combined$bonus,c(100,200,NA_real_)))');
        await start(); await target(); await h.choose('c_keys','id'); await h.click('lookup1'); await h.click('lookup2');
        assert.equal(await h.control('lookup1').locator('[role="checkbox"]').getAttribute('aria-checked'),'false');
        await h.click('lookup1');
        await execute('first-lookup','stopifnot(identical(combined$id,c(1,2,4)), identical(combined$age,c(10,20,NA_real_)))');
        await start(); await target(); await h.choose('c_keys','id'); await h.choose('c_excluded','(2) bonus');
        await execute('exclude-source-variable','stopifnot(identical(names(combined),c("id","age","group")))');
        await start(); await target(); await h.choose('c_keys','id'); await h.click('lookup2');
        const rejected = await h.syntax();
        const duplicate = spawnSync(process.env.RSCRIPT || 'Rscript',['--vanilla','-'],{input:preamble+'second$id <- c(1,1,4)\ntryCatch({'+rejected+'}, error=function(e) NULL)\nstopifnot(!exists("combined"))\n',encoding:'utf8',timeout:30000});
        if (duplicate.error) throw duplicate.error;
        assert.equal(duplicate.status,0,duplicate.stderr);
        report.cases.push({name:'duplicate-lookup-rejected-before-assignment',status:'passed'});
        for (const [x,y,count] of [['first','short',3],['short','first',3],['first','empty',3],['empty','empty2',0],['rows','short',3]]) {
            await start('addvariables',x,y); await target(); await h.click('by_order');
            assert.equal(await h.control('lookup1').locator('[role="checkbox"]').getAttribute('aria-disabled'),'true');
            await execute(`row-order-${x}-${y}`,`stopifnot(nrow(combined)==${count})`+(count===3&&y==='short'?'\nstopifnot(identical(combined$extra,c(99,NA_real_,NA_real_)))':''));
        }
        await start(); await target(); await h.choose('c_keys','id'); await h.fill('newdataset','first'); await h.click('b_run');
        assert.equal((await h.commands()).length,0,'An existing output dataset cannot be overwritten through New dataset');
        await h.click('b_reset');
        assert.equal(await h.control('dataset1').locator('.active').count(),0);
        assert.equal(await h.control('c_keys').locator('.container-item').count(),0);
        report.cases.push({name:'existing-output-validation-and-reset',status:'passed'});
        await start('addcases');
        await execute('append-preserves-first-schema','stopifnot(nrow(first)==6, identical(names(first),c("id","age","group")), all(is.na(first$age[4:6])))');
        await start('addcases'); await h.choose('c_unpaired','(2) bonus'); await h.click('button1');
        await h.choose('c_common','(2) bonus');
        assert.equal((await h.control('button1').innerText()).trim(),'←');
        await h.click('button1');
        assert.equal(await h.control('c_common').getByText('(2) bonus',{exact:true}).count(),0);
        report.cases.push({name:'append-transfer-direction-and-return',status:'passed'});
        await start('addcases'); await target('addcases');
        for (const variable of ['(1) age', '(1) group']) { await h.choose('c_common',variable); await h.click('button1'); }
        await execute('append-new-common-columns','stopifnot(nrow(combined)==6, identical(names(combined),"id"), nrow(first)==3)');
        report.status='passed';
        console.log(`Rendered merges: ${report.cases.length} cases passed with actual R results.`);
    } catch(error) {
        report.status='failed';report.failure=error.stack;
        await h.page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});throw error;
    } finally {
        fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,4)+'\n');await h.browser.close();
    }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
