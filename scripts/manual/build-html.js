"use strict";

const fs = require("node:fs");
const path = require("node:path");
const chapters = require("./chapters.cjs");
const productPackage = require("../../package.json");
const docs = path.resolve(__dirname, "../../docs");
const escape = text => String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const productVersion = String(productPackage.version || "").trim();
let figureNumber = 0;

function figure(name, caption) {
    const file = "images/manual/" + name + ".png";
    const bytes = fs.readFileSync(path.join(docs, file));
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    // Captures are Retina images. Their natural application size is one CSS
    // pixel for every two bitmap pixels; responsive CSS only reduces it when
    // that size cannot fit the manual column.
    const displayWidth = width / 2;
    figureNumber += 1;
    return `<figure class="manual-figure" style="--screenshot-width: ${displayWidth}px">
        <a href="${file}" data-enlarge aria-label="Enlarge screenshot: ${escape(caption)}"><img src="${file}" width="${width}" height="${height}" loading="lazy" alt="${escape(caption)}"></a>
        <figcaption><span>Figure ${figureNumber}</span> ${caption} <a href="${file}" data-enlarge>Enlarge screenshot</a></figcaption>
    </figure>`;
}

function expandFigures(html = "") {
    return html.replace(/\{\{figure:([^|]+)\|([^}]+)\}\}/g, (_, name, caption) => figure(name, caption));
}

function shell(title, description, body) {
    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title} — DialogR</title>
    <meta name="description" content="${description}">
    <meta name="theme-color" content="#faf9f6">
    <link rel="icon" href="images/dialogr.svg" type="image/svg+xml">
    <link rel="stylesheet" href="css/site.css">
    <script src="scripts/site.js" defer></script>
</head>
<body>
    <a class="skip" href="#main">Skip to content</a>
    <header class="wrap">
        <a class="brand" href="index.html"><img src="images/dialogr.svg" width="34" height="34" alt="">DialogR</a>
        <nav aria-label="Main navigation"><a href="index.html">Overview</a><a href="usermanual.html" aria-current="page">User manual</a><a href="download.html">Get DialogR</a></nav>
    </header>
    ${body}
    <footer class="wrap"><div><a class="brand" href="index.html">DialogR</a><p class="small">By Adrian Dusa · Part of the <a href="https://www.roda.ro/">RODA</a> tools for research.</p></div><nav aria-label="Project links"><a href="https://github.com/RODA/DialogR">Source code</a><a href="https://github.com/RODA/DialogR/issues">Report an issue</a><a href="https://roda.github.io/DialogCreator/">DialogCreator ↗</a><a href="https://github.com/RODA/DialogR/blob/main/LICENSE">License</a></nav></footer>
    <dialog id="screenshot-viewer" aria-labelledby="screenshot-title"><div class="screenshot-toolbar"><strong id="screenshot-title">Screenshot</strong><button type="button" class="button" id="close-screenshot">Close</button></div><img id="enlarged-screenshot" alt=""></dialog>
</body>
</html>
`;
}

const navigation = chapters.map(chapter => `<a href="#${chapter.id}" data-chapter-link="${chapter.id}">${chapter.title}</a>`).join("\n");
const sections = chapters.map(chapter => `<section id="${chapter.id}" data-chapter>
    <h2>${chapter.title}</h2>
    ${chapter.path ? `<p class="menu-path">${chapter.path}</p>` : ""}
    <p>${chapter.intro}</p>
    ${chapter.image ? figure(chapter.image, chapter.caption) : ""}
    ${chapter.steps ? `<h3>To carry out this example</h3><ol class="steps">${chapter.steps.map(step => `<li>${step}</li>`).join("\n")}</ol>` : ""}
    ${expandFigures(chapter.body)}
    ${chapter.result ? `<div class="read-result"><h3>What to look for</h3><p>${chapter.result}</p></div>` : ""}
    ${expandFigures(chapter.after)}
</section>`).join("\n\n").replace(/^[ \t]+$/gm, "");

fs.writeFileSync(path.join(docs, "usermanual.html"), shell(
    "Illustrated user manual",
    "Learn DialogR with screenshots, step-by-step instructions, and real ESS examples. Explore labels and declared missing values without writing analysis commands.",
    `<main id="main" class="wrap">
        <div class="page-heading"><p class="eyebrow">See it. Choose it. Run it.</p><h1>Your guide to DialogR.</h1><p class="lead">Follow the screenshots, make your selections, and understand the results. No R programming required.</p><p class="small">DialogR ${escape(productVersion)} · Actual desktop screenshots · ESS Round 9, Romania · <a href="commands.html">Optional R reference</a></p></div>
        <div class="manual-layout"><aside class="manual-nav" aria-label="Manual contents"><div id="search-controls" hidden><label class="search-label" for="manual-search">Find a task or topic</label><input id="manual-search" type="search" placeholder="Try missing values or recode" aria-controls="chapters"></div><strong>In this guide</strong><div class="toc">${navigation}</div></aside><div class="manual-content" id="chapters"><p class="small search-status" role="status" id="search-status"></p>${sections}</div></div>
    </main>`
));

const code = text => `<pre><code>${escape(text)}</code></pre>`;
fs.writeFileSync(path.join(docs, "commands.html"), shell(
    "Optional R reference",
    "An optional reference for the R commands generated by DialogR, their packages, and technical details.",
    `<main id="main" class="wrap reference-page"><div class="page-heading"><p class="eyebrow">Optional background</p><h1>Behind the dialogs.</h1><p class="lead">DialogR writes these commands from your selections. This reference is here when you want to inspect, save, or adapt them.</p><p><a href="usermanual.html">← Return to the illustrated manual</a></p></div><div class="manual-content">
    <section id="structure"><h2>The structure of a command</h2><p>This is the political-interest example from the manual:</p>${code('using(\n  ess,\n  wtable(B1_polintr, vlabel = TRUE)\n)')}<p>admisc’s using() evaluates the analysis within ess, so the function can refer to columns by their names. declared’s wtable() uses the variable’s labels and missing-value metadata. The vlabel argument requests its descriptive label.</p><p>Named arguments control options. TRUE and FALSE are logical values; quoted text is a string. A formula such as F3_agea ~ F2_gndr puts the response on the left and the grouping variable on the right. Commands generally omit options that match a function’s defaults.</p></section>
    <section id="packages"><h2>Packages and functions</h2><p>Desktop DialogR is a graphical layer on top of R: install R first, then install the packages through the Packages menu. The application uses CRAN and development repositories. Packages must be available in the R installation selected by DialogR. WebR supplies its own browser-compatible R runtime and library.</p><table><thead><tr><th>Package</th><th>Functions used by the dialogs</th></tr></thead><tbody><tr><td>admisc ≥ 0.41</td><td>using(), inside(), recode()</td></tr><tr><td>declared ≥ 0.27</td><td>wtable(), wsummary(), wquantile(), wmeasures(), and individual weighted summaries</td></tr><tr><td>DDIwR ≥ 0.20</td><td>convert() for statistical data and Excel imports</td></tr><tr><td>statistics &gt; 0.14</td><td>t.testhv(), anovahv()</td></tr><tr><td>base / stats (with R)</td><td>subset(), order(), readRDS(), t.test(), proportions(), chisq.test(), pairwise.t.test()</td></tr></tbody></table><p>The desktop setup also needs httpgd, jsonlite, askpass, later, and digest. Excel import uses readxl. If it is missing, install it in the active R library:</p>${code('install.packages("readxl")')}<p>When reusing dialog commands in a fresh R session, load the required packages and dataset first:</p>${code('library(admisc)\nlibrary(declared)\nlibrary(DDIwR)\nlibrary(statistics)\ness <- readRDS(file.choose())')}<p>For individual function documentation, use the R help system, for example help("wtable", package = "declared").</p></section>
    <section id="declared"><h2>Why the declared class matters</h2><p>The teaching file already stores the analysis variables as declared. Their labels and na_values definitions remain attached to the variables. Do not coerce them to ordinary factors or numeric vectors merely to reproduce the screenshots: that changes the data contract the examples demonstrate.</p><p>For B1_polintr, values 1–4 are substantive responses and 7, 8, 9 are declared missing. The missing categories keep distinct labels even though valid numerical calculations exclude them. B7_trstlgl instead has valid values 0–10 and declared missing codes 77, 88, 99.</p></section>
    <section id="conditions"><h2>Selection expressions</h2><p>The subset dialog accepts a condition. Declared variables support comparisons using their value labels:</p>${code('F2_gndr == "Female"\nF3_agea >= 45\nF2_gndr == "Female" & F3_agea > 45')}<p>Use == for equality, != for inequality, &amp; for “and”, and | for “or”. Conditions evaluating to missing do not select a case. The dialog builds the surrounding subset call and assignment:</p>${code('essf <- subset(ess, F2_gndr == "Female")')}</section>
    <section id="state"><h2>Filters, grouping, and weights</h2>${code('using(\n  subset(ess, F2_gndr == "Female"),\n  wtable(B1_polintr, wt = fweight, vlabel = TRUE)\n)\n\nusing(ess, wtable(B1_polintr), split.by = F2_gndr)')}<p>The support table in the <a href="usermanual.html#dataset-state">manual</a> states which dialogs use each setting. Dataset state is not a global promise that every R function will be weighted or split.</p></section>
    <section id="transform"><h2>Assignments and recoding</h2>${code('inside(\n  ess,\n  agerec <- recode(F3_agea, rules = "lo:44=1; 45:hi=2")\n)')}<p>The assignment arrow names a result; inside() updates the named dataset. Semicolons separate recoding rules. Check the result’s labels and missing definitions after a transformation. Recoding and sorting use the underlying dataset rather than the filtered analysis view.</p></section>
    <section id="summaries"><h2>Summary commands</h2>${code('using(ess, wsummary(B7_trstlgl))\nusing(ess, wmeasures(B7_trstlgl, what = c("mean", "sd")))')}<p>A single measure uses its own function; several use wmeasures(). With multiple selected variables the dialog subsets the columns and uses a dot to represent that selection. If this excludes a grouping or weight column needed by the analysis, use individual-variable analyses or adapt a script to retain those columns. The standalone range() call is not weighted.</p></section>
    <section id="tests"><h2>Tests and multiple results</h2>${code('using(ess, t.test(F3_agea, alternative = "two.sided", mu = 50, conf.level = 0.95))\n\nusing(ess, t.testhv(F3_agea ~ F2_gndr))\n\nusing(ess, {\n  print(anovahv(F3_agea ~ F14_domicil, numsum = TRUE))\n  pairwise.t.test(F3_agea, F14_domicil, p.adjust.method = "bonferroni")\n})')}<p>Braces group statements. print() displays an intermediate result before the next statement runs. The pairwise call uses its own defaults; it does not inherit the ANOVA variance or confidence settings. These unweighted teaching examples do not establish a complete complex-survey analysis.</p></section>
    <section id="exact-test"><h2>Current exact-test limitation</h2><p>The contingency dialog currently emits fischer.exact(), which is not the standard R function. The ordinary R alternative is stats::fisher.test() applied to a suitable count table:</p>${code('using(ess, {\n  .table <- wtable(B1_polintr, F2_gndr)\n  stats::fisher.test(.table)\n})')}<p>Check the table, test assumptions, and computation requirements before using this alternative.</p></section>
    <section id="excel-metadata"><h2>Optional Excel metadata sheets</h2><p>DDIwR reads the first sheet as data. Supply both a variables sheet and a values sheet (also accepted as codes) to use the metadata route. The variables sheet matches name to label. The values sheet has variable, value (or code), label, and missing columns; y marks a declared missing value. Names must match the data sheet. The import dialog does not expose a sheet selector.</p></section>
    </div></main>`
));
console.log("Built illustrated manual and optional R reference.");
