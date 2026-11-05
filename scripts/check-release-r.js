'use strict';

const { spawnSync } = require('node:child_process');

function checkReleaseR() {
    const code = `
        if (!requireNamespace("admisc", quietly = TRUE) ||
            packageVersion("admisc") < "0.41.1" ||
            !is.element("addCases", getNamespaceExports("admisc"))) {
            stop("Release tests require admisc >= 0.41.1 exporting addCases. Install the release dependency before running native tests.", call. = FALSE)
        }
        cat("Native test dependency: admisc", as.character(packageVersion("admisc")), "\\n")
    `;
    // Stdin avoids Windows command-line quoting of a multiline R expression.
    const result = spawnSync(process.env.RSCRIPT || 'Rscript', ['--vanilla', '-'], {
        input: code,
        stdio: ['pipe', 'inherit', 'inherit'],
        timeout: 30000
    });

    if (result.error) {
        throw result.error;
    }
    if (result.status !== 0) {
        throw new Error('Native R release dependency check failed (exit ' + result.status
            + ', signal ' + (result.signal || 'none') + ').');
    }
}

module.exports = { checkReleaseR };

if (require.main === module) {
    checkReleaseR();
}
