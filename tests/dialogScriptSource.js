"use strict";

const fs = require("fs");
const path = require("path");


const readDialogScriptSource = function(productRoot, sourceFile, source) {
    if (source.customJS) {
        return source.customJS;
    }

    const entry = source.script?.entry
        ? String(source.script.entry)
        : "";

    if (!entry) {
        return "";
    }

    const relativeSourceFile = sourceFile.startsWith("dialogs/")
        ? sourceFile.slice("dialogs/".length)
        : sourceFile;

    return fs.readFileSync(
        path.join(
            productRoot,
            "dialogs",
            path.dirname(relativeSourceFile),
            entry
        ),
        "utf8"
    );
};


module.exports = {
    readDialogScriptSource
};
