'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { dialogForgeRoot } = require('../tests/dialogforge');
const root = path.resolve(__dirname, '..');
const args = new Set(process.argv.slice(2));
for (const arg of args) if (!['--apps', '--web-build'].includes(arg)) throw new Error('Unknown release test option: ' + arg);
if (args.has('--web-build') && !args.has('--apps')) {
    throw new Error('--web-build requires --apps');
}
const output = path.join(root, 'artifacts/dialog-release'); fs.mkdirSync(output, { recursive: true });
const inputs = ['package.json', 'dialogs/dialogs.json', 'menu/menu.json'];
for (const entry of JSON.parse(fs.readFileSync(path.join(root,'dialogs/dialogs.json')))) {
    inputs.push('dialogs/'+entry.sourceFile, 'dialogs/'+path.dirname(entry.sourceFile)+'/actions.js');
}
const fingerprints = Object.fromEntries(inputs.map(file => [file, createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
for (const file of ['src/dialog-runtime/renderer/modules/dialogCanonicalControlAdapter.ts','src/dialog-runtime/renderer/library/customJSRuntime.ts','vendor/dialogcreator-renderer-0.1.0.tgz']) {
    fingerprints['DialogForge/'+file] = createHash('sha256').update(fs.readFileSync(path.join(dialogForgeRoot,file))).digest('hex');
}
const report = { status: 'running', startedAt: new Date().toISOString(), appWorkflowsRequested: args.has('--apps'), fingerprints, checks: [] };
function run(name, command, argv, cwd = root, env = process.env) {
    const started = Date.now();
    const commandEnv = { ...env, PATH: path.join(dialogForgeRoot, 'node_modules/.bin') + path.delimiter + env.PATH };
    const result = spawnSync(command, argv, { cwd, env: commandEnv, stdio: 'inherit', timeout: 600000 });
    report.checks.push({ name, status: result.status === 0 && !result.error ? 'passed' : 'failed', durationMs: Date.now() - started, error: result.error?.message });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(name + ' failed with status ' + result.status);
}
try {
    run('Native R release dependencies', process.execPath, ['scripts/check-release-r.js']);
    run('Product source and compatibility', process.execPath, ['scripts/check-build-ownership.js']);
    run('Product type and script checks', process.execPath, ['scripts/check-product.js']);
    for (const browser of ['chromium','firefox','webkit']) {
        run('Rendered dialogs: '+browser, process.execPath, ['tests/rendered/dialogs.js'], root, { ...process.env, DIALOGR_TEST_BROWSER: browser });
    }
    run('Actual R merge semantics', process.execPath, ['tests/rendered/merges.js']);
    run('Original defect is detected', process.execPath, ['tests/rendered/regression-detection.js']);
    for (const script of ['check-dialog-label-parity.js','rendered-canonical-controls.js']) run('Shared renderer: '+script,process.execPath,['scripts/'+script],dialogForgeRoot);
    run('Shared renderer: attachments and invalid layouts', process.execPath, [
        'scripts/rendered-element-anchoring-acceptance.js',
        '--report', path.join(output, 'attachments.json')
    ], dialogForgeRoot);
    if (args.has('--apps')) {
        run('Compile shared native host', process.execPath, ['node_modules/typescript/bin/tsc','-p','tsconfig.json'], dialogForgeRoot);
        if (args.has('--web-build')) run('Build WebR product', process.execPath, ['scripts/build-web.js','--out-dir',path.join(root,'dist/web'),root],dialogForgeRoot);
        run('Native R application',process.execPath,['tests/e2e/dialog-workflows.js']);
        run('WebR application',process.execPath,['tests/e2e/dialog-workflows.js','--web']);
    }
    report.status='passed';
} catch(error) {report.status='failed';report.failure=error.stack;console.error(error);process.exitCode=1;}
finally {report.completedAt=new Date().toISOString();fs.writeFileSync(path.join(output,'release-report.json'),JSON.stringify(report,null,4)+'\n');}
