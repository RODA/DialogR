'use strict';

const { spawnSync } = require('node:child_process');

function checkReleaseR() {
    const code = `
        if (!requireNamespace("admisc", quietly = TRUE) ||
            packageVersion("admisc") < "0.41.1" ||
            !is.element("addCases", getNamespaceExports("admisc"))) {
            stop("Release tests require admisc >= 0.41.1 exporting addCases. Install the release dependency before running native tests.", call. = FALSE)
        }
        cat("Native test dependency: admisc", as.character(packageVersion("admisc")), "; R", as.character(getRversion()), "\\n")
        cat(file.path(R.home("bin"), if (.Platform$OS.type == "windows") "Rterm.exe" else "R"), "\\n", sep = "")
    `;
    // Stdin avoids Windows command-line quoting of a multiline R expression.
    const result = spawnSync(process.env.RSCRIPT || 'Rscript', ['--vanilla', '-'], {
        input: code,
        stdio: ['pipe', 'pipe', 'inherit'],
        encoding: 'utf8',
        timeout: 30000
    });

    if (result.error) {
        throw result.error;
    }
    if (result.status !== 0) {
        throw new Error('Native R release dependency check failed (exit ' + result.status
            + ', signal ' + (result.signal || 'none') + ').');
    }
    const lines = result.stdout.trim().split(/\r?\n/);
    const rBinary = lines.pop();
    process.stdout.write(lines.join('\n') + '\n');
    return rBinary;
}

module.exports = { checkReleaseR };

if (require.main === module) {
    const rBinary = checkReleaseR();
    if (process.argv.includes('--github-env')) {
        if (!process.env.GITHUB_ENV) throw new Error('GITHUB_ENV is required to export the verified R executable.');
        require('node:fs').appendFileSync(process.env.GITHUB_ENV, `DIALOGFORGE_R_BINARY=${rBinary}\n`);
    }
}
