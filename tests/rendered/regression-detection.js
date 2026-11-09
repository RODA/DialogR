'use strict';
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const result = spawnSync(process.execPath, [path.join(__dirname, 'dialogs.test.js')], {
    env: { ...process.env, DIALOGR_TEST_RADIO_REGRESSION: '1' }, encoding: 'utf8', timeout: 120000
});
if (result.error) throw result.error;
assert.equal(result.status, 1, 'The rendered suite must reject the original adapter defect');
assert.match(result.stdout + result.stderr, /radiogroup1 is not defined/, 'Failure must identify the lost radio group, not an unrelated environment error');
console.log('Regression detection passed: restoring the radio-group defect fails the rendered Recode test.');

const selection = spawnSync(process.execPath, [path.join(__dirname, 'merges.test.js')], {
    env: { ...process.env, DIALOGR_TEST_SELECTION_REGRESSION: '1' }, encoding: 'utf8', timeout: 120000
});
if (selection.error) throw selection.error;
assert.equal(selection.status, 1, 'The suite must reject scripted selection event recursion');
assert.match(selection.stdout + selection.stderr, /button1 is disabled/);
console.log('Regression detection passed: restoring selection events disables the tested transfer button.');
