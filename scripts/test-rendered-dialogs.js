'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');

function discoverRenderedTests(directory = path.join(root, 'tests/rendered')) {
    const tests = fs.readdirSync(directory, { withFileTypes: true })
        .filter(entry => entry.isFile() && entry.name.endsWith('.test.js'))
        .map(entry => ({
            name: entry.name.slice(0, -'.test.js'.length),
            file: path.join(directory, entry.name)
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

    if (tests.length === 0) {
        throw new Error('No rendered dialog tests found in ' + directory);
    }
    return tests;
}

function main(args) {
    const tests = discoverRenderedTests();
    if (args.length === 1 && args[0] === '--list') {
        console.log(tests.map(test => test.name).join('\n'));
        return;
    }

    const requested = new Set(args);
    const unknown = args.filter(name => !tests.some(test => test.name === name));
    if (unknown.length > 0) {
        throw new Error('Unknown rendered test suite: ' + unknown.join(', ')
            + '. Use --list to see available suites.');
    }

    for (const test of tests) {
        if (requested.size > 0 && !requested.has(test.name)) {
            continue;
        }
        console.log('Running rendered dialog suite: ' + test.name);
        const result = spawnSync(process.execPath, [test.file], {
            cwd: root,
            env: process.env,
            stdio: 'inherit',
            timeout: 600000
        });
        if (result.error) {
            throw result.error;
        }
        if (result.status !== 0) {
            process.exitCode = result.status || 1;
            return;
        }
    }
}

module.exports = { discoverRenderedTests };

if (require.main === module) {
    try {
        main(process.argv.slice(2));
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
