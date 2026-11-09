"use strict";

// Illustrated procedures based on ESS Round 9 Romania and the supplied merge samples.
module.exports = [

    {
        "id": "getting-started",
        "title": "Your first analysis",
        "intro": "Follow a complete example with European Social Survey data: import a dataset, choose a variable, and produce a table that distinguishes valid responses from declared missing values. DialogR constructs the command for you.",
        "body": "<div class=\"callout\"><p><strong>The dataset used in this guide.</strong> Screenshots use the English-labelled <a href=\"https://roda.ro/studies/roda-ess9?lang=en\"><strong>European Social Survey, Round 9, Romania</strong></a> dataset from the RODA catalogue, imported as <strong>ess</strong>. It contains 1,846 cases and 343 variables. The merge chapters use separate, small invented datasets supplied with this guide. The analysis variables retain their <strong>declared</strong> classes, labels, and missing-value definitions.</p><p>Download <strong>roda-ess9-v1-en.rds</strong> from the catalogue record to follow the examples exactly. The broader <a href=\"https://ess.sikt.no/\">ESS Data Portal</a> also provides ESS data, but another rendition may have different variable names.</p></div><ol class=\"steps\"><li><strong>Start DialogR.</strong> Complete <a href=\"#packages\">desktop setup</a>, or wait for WebR to load.</li><li><strong>Choose File → Import data.</strong> Choose <strong>roda-ess9-v1-en.rds</strong>, enter <strong>ess</strong> in <strong>Assign to</strong>, and click <strong>Import</strong>.</li><li><strong>Open the dataset editor.</strong> Explore the Data and Variables tabs. Keep the labels and missing-value definitions supplied with the file.</li><li><strong>Choose Analyze → Descriptive statistics → Frequency table.</strong> Select ess and <strong>B1_polintr</strong>, “How interested in politics”.</li><li><strong>Select Variable label and click Run.</strong> Leave Show values, Valid frequencies, and Observed only selected. No command needs to be typed.</li></ol>",
        "image": "frequencies",
        "caption": "ESS political interest: the dataset and variable are selected, with Variable label enabled. Click Run.",
        "result": "The four valid response categories contain 135, 380, 659, and 665 cases. Seven cases are labelled Refusal and treated as missing for the valid percentages. The overall total is 1,846; the valid total is 1,839. “Not at all interested” therefore represents 36.0% of all cases and 36.2% of valid responses.",
        "after": "{{figure:frequencies-output|Actual DialogR output: refusal remains visible as a distinct category, while valid percentages use only valid responses.}}<p>Begin with no filter, split groups, or weight. These are unweighted teaching examples for the supplied Romanian dataset, not population estimates for all ESS countries. Read <a href=\"#declared-values\">Labels and declared missing values</a> next.</p>"
    },
    {
        "id": "from-spss",
        "title": "Get to know the data editor",
        "intro": "If you have used SPSS, the layout will be familiar. Switch between the observations themselves and the definitions of their variables.",
        "image": "data-view",
        "caption": "The ESS dataset in the Data editor. The bottom tabs switch between individual cases and variable definitions.",
        "body": "<h3>Work with the data</h3><p>Open ess from the workspace. The Data tab shows one respondent per row and one variable per column. Check the dataset name and dimensions at the top. The RODA file contains 1,846 rows and 343 columns; use the scrollbars or <a href=\"#goto\">Go to</a> to reach a particular variable.</p>",
        "after": "<h3>Review the variables</h3><p>Click <strong>Variables</strong>. Rows now describe variables. Find <strong>B1_polintr</strong> to see its descriptive label and value definitions. The <strong>Values</strong> cell opens the editor for category labels and missing values.</p>{{figure:variable-view|Variable view keeps names, types, labels, and value definitions together.}}<p>The numeric storage type does not mean the variable is an ordinary unlabelled number. Its <strong>declared</strong> class also carries its meaning: category labels and which codes are missing. <a href=\"#declared-values\">Inspect those definitions</a> before an analysis.</p><h3>Find an analysis</h3><p><strong>Data</strong> prepares cases and variables, <strong>Transform</strong> contains recoding, and <strong>Analyze</strong> contains statistical procedures. Dialogs construct the commands from your choices.</p><p>SPSS data files can be imported through <a href=\"#import\">Import data</a>. Existing SPSS syntax is not translated; the <a href=\"#dialog-reference\">task guide</a> lists the available procedures.</p>"
    },
    {
        "id": "finding-variables",
        "title": "Find and keep track of variables",
        "intro": "Hundreds of variables need not mean hundreds of rows to search through. DialogR keeps selected variables pinned at the top of variable lists and lets you search within a list.",
        "image": "selected-variables",
        "caption": "B1_polintr is selected and pinned at the top of the ESS variable list.",
        "body": "<h3>See what you have selected</h3><p>Selected variables move to the top of their container, so you can check your choices together without hunting through the dataset. Pinning changes the display of the list; it does not reorder the columns in your data.</p><h3>Search a variable list</h3><ol class=\"steps\"><li>Move the mouse pointer over the variable list you want to search.</li><li>Press <strong>Ctrl + F</strong> on Windows or Linux, or <strong>Cmd + F</strong> on macOS. A search box appears above that list.</li><li>Type all or part of a variable name. For example, type <strong>trstlgl</strong> to find <strong>B7_trstlgl</strong>, trust in the legal system.</li><li>Select the variable you need. Press <strong>Escape</strong> to close the search and show the full list again.</li></ol>",
        "after": "{{figure:variable-search|Search within the ESS variable list using part of a variable name.}}<p>Search narrows what is visible; it does not clear an existing selection. A selected variable that does not match the search may be hidden temporarily. Close the search to review the selected variables at the top.</p><p>To keep the command created from your choices, use <a href=\"#commands\">Send to Script Editor</a>.</p>"
    },
    {
        "id": "declared-values",
        "title": "Labels and declared missing values",
        "intro": "DialogR uses the declared R package to solve a familiar problem in R: keeping several kinds of missing response distinct. Refusal, “don’t know”, and “not applicable” can each retain their own code and label while being treated as missing in supported calculations.",
        "image": "declared-missing",
        "caption": "Value definitions for ESS political interest. Refusal, Don’t know, and No answer have distinct labels and are marked as missing.",
        "steps": [
            "Open <strong>ess</strong> in the dataset editor and select <strong>Variables</strong>.",
            "Find <strong>B1_polintr</strong> (How interested in politics). Click the <strong>…</strong> button in its Values cell.",
            "Review the labels for 1–4 and the missing flags for <strong>7 Refusal</strong>, <strong>8 Don’t know</strong>, and <strong>9 No answer</strong>.",
            "For this example, leave the supplied definitions unchanged and click <strong>Cancel</strong>. To intentionally change a definition in your own dataset, edit the label or Missing flag and click Save."
        ],
        "body": "<h3>Powered by the declared R package</h3><p>An ordinary R missing value, NA, does not by itself record why a response is missing. The <a href=\"https://CRAN.R-project.org/package=declared\">declared package</a> carries those definitions with the variable. DialogR makes them accessible through dialogs and the variable editor, without requiring you to write R code.</p><h3>Missing does not have to mean “unknown reason”</h3><p>Refusal and “don’t know” are different responses. Declaring them missing allows analyses to exclude them from valid calculations while keeping those distinctions available in the data and frequency table. You do not have to replace all of them with one anonymous blank value.</p><h3>Which codes count as missing?</h3><p>It depends on the variable’s definition. Political interest declares 7, 8, and 9 missing. Trust in the legal system (<strong>B7_trstlgl</strong>) uses 77, 88, and 99. Age (<strong>F3_agea</strong>) declares 999 as “Not available”. A number is not missing merely because it looks unusual.</p><p>The supplied file already has these definitions. Keep them when importing, subsetting, or saving. Plain CSV does not preserve variable labels, value labels, or declared missing-value metadata; use a format that preserves those definitions when you need them.</p>",
        "result": "With Observed only selected, the political-interest table shows the seven refusals that actually occur. Don’t know and No answer remain defined in the variable even though neither occurs here. Clear Observed only if you want to include unobserved labelled categories.",
        "after": "<p>In <a href=\"#summaries\">Numerical summaries</a>, trust scores use their valid 0–10 scale: 77, 88, and 99 must not be treated as unusually high trust. The declared class makes this distinction part of the variable, not a rule you have to remember for each calculation.</p>"
    },
    {
        "id": "packages",
        "title": "Set up DialogR",
        "intro": "Choose desktop DialogR for local work, or WebR to start in a browser with the required packages already supplied.",
        "body": "<div class=\"callout\"><p><strong>Desktop: DialogR is a graphical layer on top of R.</strong> You are responsible for installing R itself and the necessary R packages. Installing DialogR alone does not provide the statistical runtime or the packages that perform its calculations and imports.</p><p><strong>WebR: R and the packages are supplied in the browser, but analysis is slower.</strong> You do not need to install R or its packages on your computer. The same dataset can be used; allow more time for the browser runtime, imports, and analyses.</p></div>\n            <h3>Complete desktop setup</h3><ol class=\"steps\"><li>Install <a href=\"https://cran.r-project.org/\">R</a> for your operating system.</li><li>Install the appropriate DialogR release from <a href=\"download.html\">Get DialogR</a> and start the application.</li><li>Confirm that DialogR is using your local R installation in the runtime settings.</li><li>Choose <strong>Packages → Install required R packages</strong>. Keep your internet connection available and wait for installation to finish.</li><li>If a dialog reports an old package, choose <strong>Packages → Update development versions</strong>. Read any installation error before trying again.</li></ol>\n            <h3>What the packages do</h3><div class=\"table-scroll\"><table><thead><tr><th>Package</th><th>What it supplies</th><th>Required version</th></tr></thead><tbody><tr><td>admisc</td><td>Working within datasets, recoding values, and adding cases.</td><td>0.41.1 or newer</td></tr><tr><td>declared</td><td>Labelled data, missing-value handling, tables, and summaries.</td><td>0.27 or newer</td></tr><tr><td>DDIwR</td><td>Importing data from other statistical software and Excel.</td><td>0.20 or newer</td></tr><tr><td>statistics</td><td>Independent-samples t-tests and one-way ANOVA with variance-homogeneity handling.</td><td>Newer than 0.14</td></tr></tbody></table></div>\n            <p>The setup workflow also installs supporting packages. They must be installed in the R installation used by DialogR. If Excel import reports a missing readxl package, that import dependency must be installed in the same R library. Further technical information is in the <a href=\"commands.html#packages\">optional package reference</a>.</p>"
    },
    {
        "id": "languages",
        "title": "Change the interface language",
        "path": "Settings → General → Language",
        "intro": "Work in English, German, Greek, Spanish, French, Polish, or Romanian. DialogR applies the change to the interface and every open dialog without restarting the application.",
        "steps": [
            "Open <strong>Settings</strong> and find <strong>General → Language</strong>.",
            "Choose <strong>English</strong>, <strong>Deutsch</strong>, <strong>Ελληνικά</strong>, <strong>Español</strong>, <strong>Français</strong>, <strong>Polski</strong>, or <strong>Română</strong>.",
            "Save the setting. Menus, editors, and open dialogs refresh immediately; there is no need to close or restart DialogR."
        ],
        "body": "<p>The language choice is kept for your next session. It changes the application interface, not variable names, value labels, or text stored in your dataset. Generated R commands also retain the function and variable names required by R.</p>"
    },
    {
        "id": "import",
        "title": "Import data",
        "path": "File → Import data",
        "intro": "Bring in a dataset from SPSS, Stata, SAS, Excel, a text file, or an R dataset. Importing data does not import another program’s analyses or syntax.",
        "image": "import",
        "caption": "Import roda-ess9-v1-en.rds from the RODA catalogue and assign it the name ess.",
        "steps": [
            "Click <strong>Browse</strong> and choose <strong>roda-ess9-v1-en.rds</strong>, or your own supported data file.",
            "Enter <strong>ess</strong> under Assign to for this example.",
            "For a text file, check separator, decimal mark, header, missing-value marker, quotes, and encoding. These parsing controls are not needed for the RODA R dataset.",
            "Click <strong>Import</strong>. Open the dataset and review variable labels, value labels, and missing-value definitions in Variables view."
        ],
        "body": "<div class=\"callout\"><p><strong>One study, several formats.</strong> The <a href=\"https://roda.ro/studies/roda-ess9?lang=en\">RODA catalogue record</a> offers this dataset as SPSS, Stata, SAS Transport, R, and Excel files. This guide uses the English R file, <strong>roda-ess9-v1-en.rds</strong>.</p></div><h3>Supported files</h3><div class=\"table-scroll\"><table><thead><tr><th>Source</th><th>File types</th></tr></thead><tbody><tr><td>SPSS</td><td>.sav, .zsav, .por</td></tr><tr><td>Stata</td><td>.dta</td></tr><tr><td>SAS</td><td>.sas7bdat, .xpt</td></tr><tr><td>Excel</td><td>.xls, .xlsx</td></tr><tr><td>Delimited text</td><td>.csv, .txt, .tsv, .tab, .dat</td></tr><tr><td>R dataset</td><td>.rds</td></tr></tbody></table></div>\n            <h3>Prepare an Excel worksheet</h3><p>Put a single rectangular table on the first sheet. The first row should contain unique variable names, with one variable per column and one case per following row. Remove title rows, merged cells, subtotals, and blank rows within the table. Use consistent types of values in each column.</p><p>The dialog does not offer a sheet selector. Move the intended table to the first sheet, or save it as CSV. Optional DDIwR metadata sheets are described in the <a href=\"commands.html#excel-metadata\">advanced import reference</a>.</p><h3>Check the import</h3><p>If text data appears in one column, check the separator. If accents look wrong, check the encoding. A value such as 99 is not automatically missing: check the file’s missing-value definitions.</p><p>In WebR, choose the file through the browser’s file picker. Save the files and results you need before closing the session.</p>",
        "result": "The RODA dataset appears as ess with 1,846 cases and 343 variables. Its declared variables retain the supplied labels and missing-value definitions. A CSV import cannot supply metadata that was not stored in the file."
    },
    {
        "id": "export",
        "title": "Export data",
        "intro": "Choose File → Export data to save a workspace dataset for SPSS, Stata, SAS, R, Excel, or DDI.",
        "body": "<p>Select a dataset and format, then enter the full file path in <strong>Destination</strong> or choose it with <strong>Browse…</strong>. A file name without a folder saves in the current R working directory. Click <strong>Export</strong> to write the files. On desktop, DialogR asks before replacing an existing file. In the browser, the R working directory is in WebR. Export downloads the files to your computer. If your browser supports Browse, you can choose where to save the main file. Any companion files download separately. Each format has its own option pane. Switching formats retains each pane’s choices; Reset restores their defaults. Export uses the complete dataset; it does not apply analysis filters, grouping, or weights and does not change the workspace object. These options require DDIwR 0.22.2 or later.</p><h3>SPSS compression</h3><p><strong>Byte</strong> writes a byte-compressed .sav file. <strong>None</strong> writes an uncompressed .sav file. <strong>ZSAV</strong> writes a compressed .zsav file and updates the suggested extension.</p><h3>Stata</h3><p>Choose a version from 8 through 15; the default is 14. Character categories can be converted to numeric categories for labelled Stata variables.</p><h3>SAS</h3><p>Native .sas7bdat export can include a companion .sas7bcat value-label catalog. SAS Transport export offers XPT versions 5 and 8, defaulting to 5. Transport files contain data without value-label definitions; this dialog exports only the transport file. Use native SAS with the catalog option when value labels are required. DDIwR currently limits transport variable names to eight characters for both versions.</p><h3>R</h3><p>R export saves a single dataset as an .rds file. Read it with <code>readRDS()</code>. The object retains its classes, labels, missing-value definitions, and other attributes. Choose Gzip (the default), Bzip2, XZ, or no compression. Compression changes storage size and speed, not the saved data.</p><h3>Excel</h3><p>Excel export writes an .xlsx workbook with three sheets: data, variables, and values. The latter two contain variable labels, formats, category labels, and missing-value definitions. This format requires the writexl package.</p><h3>DDI</h3><p>DDI export writes a DDI Codebook 2.6 XML file. Under Data, choose Embedded to include the dataset inside the XML, Separate CSV to save observations in a companion .csv file, or None for metadata only. Keep the XML and companion CSV together with the same base name. DDIwR validates the XML against its bundled schema. Extended missing-value codes cannot be exported to DDI.</p><h3>Missing values</h3><p>Recoding translates missing values to the destination’s representation. For Stata and SAS, harmonization uses consistent extended missing-value codes across variables when possible.</p>"
    },
    {
        "id": "dialog-reference",
        "title": "Choose a task",
        "intro": "Find the task you want to carry out, then follow its illustrated instructions. The menu names below match the application.",
        "body": "<div class=\"task-links\"><a href=\"#addcases\">Append another batch of cases <span>Add cases →</span></a><a href=\"#addvariables\">Bring in additional columns <span>Add variables →</span></a><a href=\"#sortby\">Put cases in order <span>Sort cases →</span></a><a href=\"#splitby\">Analyse groups separately <span>Split by groups →</span></a><a href=\"#select\">Keep selected cases or columns <span>Subset cases and variables →</span></a><a href=\"#weightby\">Use case frequencies <span>Apply frequency weighting →</span></a><a href=\"#recode\">Combine or change values <span>Recode variables →</span></a><a href=\"#frequencies\">Count responses <span>Frequency table →</span></a><a href=\"#crosstable\">Compare two categorical variables <span>Contingency table →</span></a><a href=\"#summaries\">Summarise numeric variables <span>Numerical summaries →</span></a><a href=\"#onesamplettest\">Compare a mean with a value <span>One-sample t-test →</span></a><a href=\"#independentsamplesttest\">Compare two independent groups <span>Independent samples t-test →</span></a><a href=\"#anovahv\">Compare several group means <span>One-way ANOVA →</span></a><a href=\"#bivariate\">Test a pair of numeric variables <span>Bivariate correlation →</span></a><a href=\"#goto\">Find a case or variable <span>Go to… →</span></a></div><p><strong>Run</strong> carries out an analysis. <strong>OK</strong> confirms a data-management choice. <strong>Reset</strong> restores dialog options; it does not undo a transformation already carried out.</p>"
    },
    {
        "id": "merge-files",
        "title": "Combine two datasets",
        "path": "Data → Merge Files",
        "intro": "Choose Add cases to append rows, or Add variables to bring columns together. Both dialogs start with two empty dataset selections: choose a different dataset in each list. The selected dataset is unavailable in the other list.",
        "body": "<h3>Try the small example files</h3><p>These invented data make it easy to see exactly what each merge does. They are separate from the ESS examples elsewhere in this guide. Download the files below, then use <strong>File → Import data</strong> to import each CSV under the indicated dataset name. Keep the first row as variable names and use a comma separator.</p><div class=\"table-scroll\"><table><thead><tr><th>Download</th><th>Import as</th><th>Contents</th></tr></thead><tbody><tr><td><a href=\"examples/respondents.csv\" download>respondents.csv</a></td><td>respondents</td><td>Four respondents: id, age, region</td></tr><tr><td><a href=\"examples/later.csv\" download>later.csv</a></td><td>later</td><td>Two more respondents, with an extra mode variable</td></tr><tr><td><a href=\"examples/regions.csv\" download>regions.csv</a></td><td>regions</td><td>Region codes, names, and an internal note</td></tr><tr><td><a href=\"examples/notes.csv\" download>notes.csv</a></td><td>notes</td><td>Three review entries, for the optional row-order example</td></tr></tbody></table></div><h3>Decide where the result should go</h3><p>By default, either dialog replaces <strong>Dataset 1</strong> with the result. Select <strong>New dataset</strong> and enter a name such as <strong>survey_all</strong> to keep both sources. The new name must not already belong to a dataset. <strong>Run</strong> performs the merge; <strong>Reset</strong> restores the dialog choices but does not undo an executed merge.</p><h3>Check active filters</h3><p>A filter on either source limits which cases enter the merge. Clear the source filters first to combine all cases. Split groups and frequency weights are not applied by these dialogs. When replacing Dataset 1, the merge result replaces its contents, including when a filter was active. Use a new dataset to retain the source for comparison.</p>"
    },
    {
        "id": "addcases",
        "title": "Add cases",
        "path": "Data → Merge Files → Add cases",
        "intro": "Append the cases from Dataset 2 after the cases from Dataset 1. Variables are matched by name, so their column positions need not agree. Cases are appended even when identifiers repeat; this operation does not remove duplicate cases.",
        "image": "addcases",
        "caption": "Append later to respondents in a new dataset, survey_all. The extra mode variable from Dataset 2 is included in Common.",
        "steps": [
            "Import <strong>respondents.csv</strong> as <strong>respondents</strong> and <strong>later.csv</strong> as <strong>later</strong>, following <a href=\"#merge-files\">the example setup</a>.",
            "Select <strong>New dataset</strong> and enter <strong>survey_all</strong>. Do this before choosing the datasets to start with only their shared variables in Common.",
            "Choose <strong>respondents</strong> in <strong>Dataset 1</strong> and <strong>later</strong> in <strong>Dataset 2</strong>. The shared variables id, age, and region appear in <strong>Common</strong>.",
            "Select <strong>(2) mode</strong> in <strong>Unpaired</strong> and click the right arrow to include it.",
            "Click <strong>Run</strong>, then open <strong>survey_all</strong> to inspect the six cases."
        ],
        "body": "<h3>Common and unpaired variables</h3><p><strong>Common</strong> lists the variables to retain in the result. Variables originally present in only one source can be added from <strong>Unpaired</strong>. The prefix <strong>(1)</strong> means a variable belongs only to Dataset 1; <strong>(2)</strong> means it belongs only to Dataset 2. The prefix stays visible after the variable moves to Common; it is not added to the variable name in the dataset.</p><p>An included unpaired variable receives <strong>NA</strong> for every case from the source where it was absent. To return an optional variable to Unpaired, select it in Common: the button changes to a left arrow. Variables shared by both sources stay included.</p><h3>Keeping Dataset 1’s variables</h3><p>When replacing Dataset 1, all of its variables stay in Common. You may add variables unique to Dataset 2, but cannot remove Dataset 1’s variables. With <strong>New dataset</strong> selected, you can also choose which variables unique to Dataset 1 to include. Choices already made are retained when you switch this option.</p><p>If the sources have no shared variable names, a new dataset starts with an empty Common list. Move at least one unpaired variable into Common before running. Keeping variables from both sources produces columns filled with NA for the cases where each was absent.</p><p>Check that identically named variables mean the same thing and use compatible types and coding. For example, the same response code should not mean different answers in the two files. Add cases uses <strong>admisc 0.41.1 or newer</strong>.</p>",
        "result": "survey_all has six rows and the four variables id, age, region, and mode. The original four respondents come first, with NA in mode; the two later cases follow, with phone and online. Both source datasets remain available because New dataset was selected."
    },
    {
        "id": "addvariables",
        "title": "Add variables",
        "path": "Data → Merge Files → Add variables",
        "intro": "Bring columns together by matching key values, or by pairing the first row with the first row, the second with the second, and so on. Key matching uses R’s merge(); row-order matching uses cbind(). No additional R package is required.",
        "image": "addvariables",
        "caption": "Match respondents to the regions lookup using region. Keep all respondents, exclude the lookup’s internal_note, and save survey_named.",
        "steps": [
            "Import <strong>respondents.csv</strong> as <strong>respondents</strong> and <strong>regions.csv</strong> as <strong>regions</strong>, following <a href=\"#merge-files\">the example setup</a>.",
            "Choose <strong>respondents</strong> in <strong>Dataset 1</strong> and <strong>regions</strong> in <strong>Dataset 2</strong>. Leave <strong>By key variables</strong> selected.",
            "Select <strong>region</strong> in <strong>Key variables</strong>.",
            "Under <strong>Lookup</strong>, select <strong>2</strong>: regions supplies the region names, while the cases from respondents are retained.",
            "Select <strong>(2) internal_note</strong> in <strong>Excluded variables</strong> to leave that column out of the result.",
            "Select <strong>New dataset</strong>, enter <strong>survey_named</strong>, and click <strong>Run</strong>."
        ],
        "body": "<h3>Select the matching keys</h3><p>The Key variables list contains variable names present in both sources. Select one or several keys directly in this list; selected keys are pinned at the top. With several keys, their values must match together. For example, a household number and a person number may identify a respondent jointly.</p><p>The key names must agree between the sources. If names differ, rename them before using this dialog. Check that the values use the same coding and compatible types. At least one key is required in key mode; datasets without common variable names can still be combined <a href=\"#merge-by-row-order\">by row order</a>.</p><h3>Choose a lookup, if needed</h3><p>A lookup supplies information for matching cases in the other dataset. The two checkboxes exclude one another; clearing both keeps only matched cases.</p><div class=\"table-scroll\"><table><thead><tr><th>Lookup choice</th><th>Cases retained</th><th>Required unique keys</th></tr></thead><tbody><tr><td>Neither selected</td><td>Only matches between the sources</td><td>No uniqueness check</td></tr><tr><td>1</td><td>All cases from Dataset 2, with information from Dataset 1</td><td>Dataset 1</td></tr><tr><td>2</td><td>All cases from Dataset 1, with information from Dataset 2</td><td>Dataset 2</td></tr></tbody></table></div><p>A case without a lookup match receives NA in the added columns. Unused lookup rows do not create extra cases. The lookup must have one row per key, or per combination of keys; repeated lookup keys stop the operation before the result is assigned.</p><p>Without a lookup, repeated keys can produce several matches. If a key occurs twice in each source, it produces four result rows. Missing key values can match one another too, so inspect missing identifiers before merging. Key matching sorts the result by the selected keys; it does not preserve the original case order, and the sources need not be sorted in advance.</p><h3>Exclude columns directly</h3><p>The Excluded variables list contains variables from both sources, prefixed <strong>(1)</strong> and <strong>(2)</strong>. Select the columns to leave out; selected exclusions are pinned at the top. Click a selected item again to keep it. Selected keys cannot be excluded, and an excluded variable cannot be chosen as a key until its exclusion is cleared.</p><p>For key matching, a non-key name retained from both sources normally becomes two columns with <strong>.x</strong> and <strong>.y</strong> suffixes. Exclude one copy if you only want one of them.</p><h3 id=\"merge-by-row-order\">Match by row order</h3><p>Choose <strong>By row order</strong> only when the first case in one file belongs with the first case in the other. No key is used or checked. Key and lookup controls are disabled, while exclusions remain available. The result keeps the longer source’s number of rows; missing rows in the shorter source are filled with NA rather than recycled. Both columns are retained if they have the same name, which may leave repeated names in this mode.</p><p>To try it, import <a href=\"examples/notes.csv\" download>notes.csv</a> as <strong>notes</strong>. Select respondents and notes, choose By row order, and save a new dataset named <strong>survey_notes</strong>. Its fourth case has NA in reviewed because notes contains only three entries.</p>{{figure:addvariables-order|By row order pairs the four respondents with three notes and fills the last review entry with NA.}}",
        "result": "survey_named has four cases. The two respondents in region 1 receive North, the respondent in region 2 receives South, and the respondent in region 4 receives NA because that code has no lookup entry. The unused lookup code 3 adds no case. internal_note is absent, and both source datasets are unchanged."
    },
    {
        "id": "sortby",
        "title": "Sort cases",
        "path": "Data → Sort cases",
        "intro": "Put respondents in order by one or more variables. The example sorts by age and saves the ordered cases into a separate dataset.",
        "image": "sortby",
        "caption": "F3_agea (age) is in the sorting list. The new dataset is named ess_sorted.",
        "steps": [
            "Select <strong>ess</strong>.",
            "Select <strong>F3_agea</strong> and click the arrow to move it into Sort cases by.",
            "Select <strong>New dataset with sorted data</strong> and enter <strong>ess_sorted</strong>.",
            "Click <strong>OK</strong> and open ess_sorted to inspect the order."
        ],
        "body": "<h3>Sorting options</h3><p>You may choose several sorting variables. The first is the primary key; later variables break ties. Sorting follows ascending R order. Without the new-dataset option, DialogR replaces the original dataset with the sorted version.</p>",
        "result": "The cases are ordered by age, from younger to older. The original ess dataset remains available. Sorting changes row order, not the variable labels or missing-value definitions."
    },
    {
        "id": "splitby",
        "title": "Split by groups",
        "path": "Data → Split by groups",
        "intro": "Repeat a supported analysis separately for each group. The example produces political-interest tables by the gender categories recorded in the ESS dataset.",
        "image": "splitby",
        "caption": "F2_gndr (Gender) has been moved into Split by.",
        "steps": [
            "Select <strong>ess</strong>.",
            "Move <strong>F2_gndr</strong> into Split by using the arrow.",
            "Click <strong>OK</strong>, then run a frequency table for <strong>B1_polintr</strong>.",
            "When finished, reopen Split by groups for ess and click <strong>Reset</strong> to clear grouping."
        ],
        "body": "<h3>Options and scope</h3><p>More than one grouping variable defines combinations of groups. Moving variables changes the stored grouping choice immediately. The dialog also records a sorting preference; use <a href=\"#sortby\">Sort cases</a> when you need to explicitly reorder rows.</p><p>Grouping is used by frequency tables, contingency tables, numerical summaries, and one-way ANOVA. It is not used by the two t-test dialogs. See <a href=\"#dataset-state\">Filters, groups, and weights</a>.</p>",
        "result": "You receive a separate table for each observed gender category, with the category labels retained. The original data remain one dataset. Check the valid denominator within each group, particularly where declared missing responses occur."
    },
    {
        "id": "select",
        "title": "Subset cases and variables",
        "path": "Data → Subset cases and variables",
        "intro": "Keep respondents who meet a condition, keep selected columns, or create a smaller dataset. This example follows the teaching material by selecting respondents labelled Female.",
        "image": "select",
        "caption": "The condition uses the declared value label Female. New dataset creates essf and preserves the original ess.",
        "steps": [
            "Select <strong>ess</strong> and leave all variables selected.",
            "Choose <strong>New dataset</strong> and enter <strong>essf</strong>.",
            "In the condition field, enter <strong>F2_gndr == \"Female\"</strong>. The variable’s declared labels let you refer to the category by its label.",
            "Click <strong>OK</strong> and inspect essf in the editor."
        ],
        "body": "<h3>Choose how to use the selection</h3><ul><li><strong>All cases:</strong> turns off the current filter.</li><li><strong>Filter out unselected cases:</strong> keeps the original data and restricts subsequent supported analyses.</li><li><strong>New dataset:</strong> saves the selected cases into a separate dataset.</li><li><strong>Delete unselected cases:</strong> replaces the original dataset with the selected cases.</li></ul><p>To retain only certain columns, clear <strong>all variables</strong> and select the columns you need. Include any analysis, grouping, or weight variables that later steps require.</p><p>This dialog’s condition field uses a short R expression. You do not need to write a whole command. More condition examples are in the <a href=\"commands.html#conditions\">optional expression reference</a>.</p>",
        "result": "The new dataset contains the selected respondents and retains the variables’ labels and declared missing-value definitions. The original ess remains available. Run a gender frequency table in essf to check the selection."
    },
    {
        "id": "weightby",
        "title": "Apply frequency weighting",
        "path": "Data → Apply frequency weighting",
        "intro": "Use a frequency variable when cases represent different numbers of occurrences. The supplied ESS teaching dataset includes a variable named fweight, labelled Frequency weight.",
        "image": "weightby",
        "caption": "The selected weight is fweight from the RODA ESS dataset.",
        "steps": [
            "Select <strong>ess</strong>.",
            "Move <strong>fweight</strong> into Weight cases by using the arrow.",
            "Click <strong>OK</strong>, then run a frequency table for B1_polintr.",
            "Reopen the weighting dialog for ess and click <strong>Reset</strong> to stop weighting."
        ],
        "body": "<p>Changing the weighting list updates the setting immediately. Weighted tables and supported numerical summaries use it; the t-test and ANOVA dialogs do not.</p><p>Check that the variable is numeric and really represents frequencies. This option is not a complete survey design with clusters, strata, or design-based standard errors.</p><p>This file also contains design, post-stratification, population, and analysis weights. Those are not interchangeable with frequency weights. The example uses the existing fweight variable from the teaching file; it does not claim that this menu provides a complete ESS survey-design analysis.</p>",
        "result": "Counts and percentages now use the supplied frequency weight. Missing responses remain identified by their declared codes and labels. The dataset still has 1,846 rows; weighting does not physically duplicate them."
    },
    {
        "id": "recode",
        "title": "Recode variables",
        "path": "Transform → Recode variables",
        "intro": "Turn values into categories while retaining the original variable. Following the teaching example, group age into under 45 and 45 or older.",
        "image": "recode",
        "caption": "F3_agea is recoded into agerec: ages through 44 become 1, and ages from 45 upward become 2.",
        "steps": [
            "Select <strong>ess</strong> and <strong>F3_agea</strong>.",
            "Select <strong>recode into new variable</strong> and enter <strong>agerec</strong>.",
            "Choose <strong>lowest to</strong>, enter <strong>44</strong>, and set the new value to <strong>1</strong>. Click <strong>add</strong>.",
            "Choose <strong>to highest</strong> with a lower limit of <strong>45</strong>, set the new value to <strong>2</strong>, and click <strong>add</strong>.",
            "Check both rules, then click <strong>Run</strong>."
        ],
        "body": "<h3>Other rule choices</h3><p>You can change a single value, a bounded range, missing values, or all remaining values. Replacements may be a new value, missing, or a copy of the original value. <strong>remove</strong> removes selected rules; <strong>clear</strong> empties the rule list.</p><p>Without the new-variable option, the original variable is overwritten. The operation affects the full dataset even when an analysis filter is active. These example boundaries assume ages in whole years.</p><p>The source variable declares 999 missing. Check the missing-value definition of the recoded result as well as its valid categories; do not turn a missing-age code into a genuine age group.</p>",
        "result": "The new agerec variable identifies the two age groups. Run a frequency table to check the result, then give the new categories meaningful labels in Variables view. F3_agea remains available with its original label and declared “Not available” code."
    },
    {
        "id": "frequencies",
        "title": "Frequency table",
        "path": "Analyze → Descriptive statistics → Frequency table",
        "intro": "Count the cases in each category of a variable. Start here when you want to understand how responses are distributed.",
        "image": "frequencies",
        "caption": "B1_polintr is selected with Variable label enabled. The other checked options show values, valid percentages, and observed categories.",
        "steps": [
            "Select <strong>ess</strong> in Dataset.",
            "Select <strong>B1_polintr</strong> (How interested in politics).",
            "Select <strong>Variable label</strong>. Leave Show values, Valid frequencies, and Observed only checked.",
            "Click <strong>Run</strong>."
        ],
        "body": "<h3>Table options</h3><ul><li><strong>Show values:</strong> includes the underlying codes when the variable has labels.</li><li><strong>Valid frequencies:</strong> adds percentages based on valid responses when missing values are present.</li><li><strong>Observed only:</strong> limits the table to categories that occur in the data.</li><li><strong>Variable label:</strong> includes the variable’s descriptive label, if one is defined.</li></ul>",
        "result": "The label identifies the question above the table. Read fre as the count, per as the percentage of all cases, and vld as the percentage of valid responses. The four substantive categories total 1,839 cases; the seven refusals are shown separately and excluded from vld.",
        "after": "{{figure:frequencies-output|The output retains the Refusal label and separates it from the valid responses.}}<p>For “Not at all interested”, 665 out of 1,846 cases gives 36.0%; 665 out of 1,839 valid responses gives 36.2%. The missing definition explains the difference. Filters, grouping, and frequency weights also affect the table.</p>"
    },
    {
        "id": "crosstable",
        "title": "Contingency table",
        "path": "Analyze → Descriptive statistics → Contingency table",
        "intro": "Compare political interest across the gender categories recorded in the ESS dataset. Both variables carry their declared value labels.",
        "image": "crosstable",
        "caption": "B1_polintr supplies rows; F2_gndr supplies columns.",
        "steps": [
            "Select <strong>ess</strong>.",
            "Choose <strong>B1_polintr</strong> for Rows and <strong>F2_gndr</strong> for Columns.",
            "First leave the optional tests unchecked and click <strong>Run</strong>.",
            "To compare distributions within gender categories, enable Proportions, choose <strong>Columns</strong>, and run again."
        ],
        "body": "<h3>Proportions and tests</h3><p><strong>Total</strong> uses the whole table as the denominator. <strong>Rows</strong> uses each row total. <strong>Columns</strong> uses each column total. Proportions are fractions: 0.25 means 25%.</p><p><strong>Chi square</strong> requests a test of association. Examine the table and expected-count warnings as well as the p-value.</p><div class=\"callout\"><p><strong>Current limitation:</strong> the option labelled “Fischer’s exact test” can fail because the dialog calls an unavailable function. Leave it unchecked in this version. An R alternative is described in the <a href=\"commands.html#exact-test\">optional technical reference</a>.</p></div>",
        "result": "The displayed table includes 1,839 valid cases: 649 Male and 1,190 Female. Seven political-interest refusals are excluded. Counts describe this unweighted dataset; compare column proportions when the group sizes differ.",
        "after": "{{figure:crosstable-output|Political interest by gender, retaining the original value labels and excluding declared missing responses.}}<p>Filters, split groups, and frequency weights apply. Weighted counts do not turn an ordinary chi-squared test into a complex-survey test.</p>"
    },
    {
        "id": "summaries",
        "title": "Numerical summaries",
        "path": "Analyze → Descriptive statistics → Numerical summaries",
        "intro": "Describe the centre and spread of a numeric variable. Trust in the legal system is particularly useful here: its valid scale runs from 0 to 10, with separate declared missing codes.",
        "image": "summaries",
        "caption": "B7_trstlgl (Trust in the legal system) is selected with Summary.",
        "steps": [
            "Select <strong>ess</strong> and <strong>B7_trstlgl</strong>.",
            "Choose <strong>Summary</strong> for an overview, or select individual measures such as Mean, Median, and Standard deviation.",
            "Click <strong>Run</strong>.",
            "Compare the output with the variable’s valid scale and missing-value definitions."
        ],
        "body": "<h3>Choose a summary</h3><p><strong>Summary</strong> provides an overview. <strong>Quantiles</strong> describes positions in the distribution. Individual measures include the mode, mean, median, interquartile range (IQR), range, variance, and standard deviation. Summary and Quantiles are alternatives to the individual-statistic selection.</p><p>Mean and median describe the centre. Standard deviation and IQR describe spread. The range shows the smallest and largest values. You may select more than one numeric variable.</p>",
        "result": "The mean is 4.132 and the median is 4. The valid scores range from 0 to 10; the 82 declared missing responses are excluded. Refusal 77, Don’t know 88, and No answer 99 do not inflate the mean.",
        "after": "{{figure:summaries-output|Actual summary of trust in the legal system: the values stay within the valid 0–10 scale.}}<p>Filters and split groups apply. Supported measures use frequency weights, but range is unweighted. If a multiple-variable analysis reports that a grouping or weight variable is missing, analyse variables individually or consult the <a href=\"commands.html#summaries\">technical reference</a>.</p>"
    },
    {
        "id": "onesamplettest",
        "title": "One-sample t-test",
        "path": "Analyze → Compare means and proportions → One-sample t-test",
        "intro": "Compare a numeric mean with a specified value. This illustrative example tests the respondent age variable against 50 years.",
        "image": "onesamplettest",
        "caption": "F3_agea is selected, with a hypothesised mean of 50 and a 95% confidence level.",
        "steps": [
            "Select <strong>ess</strong> and <strong>F3_agea</strong>.",
            "Enter <strong>50</strong> under Null hypothesis.",
            "Choose <strong>μ ≠ 50</strong> for a two-sided alternative.",
            "Leave Confidence level at <strong>95%</strong> and click <strong>Run</strong>."
        ],
        "body": "<h3>Other choices</h3><p>Select the greater-than or less-than alternative only when your research question calls for that direction. Enter a confidence percentage strictly between 0 and 100. The starting hypothesised mean is 0, so remember to change it for this example.</p>",
        "result": "The estimated mean is 49.60 years, with a 95% confidence interval from 48.76 to 50.44. The p-value is 0.3544. In this ordinary unweighted test, the data do not give evidence of a difference from 50 at the 5% level; this is not proof that the mean equals 50.",
        "after": "{{figure:onesamplettest-output|Actual one-sample output for age, tested against 50 years.}}<p>An active filter applies. Split groups and frequency weights do not apply to this dialog.</p>"
    },
    {
        "id": "independentsamplesttest",
        "title": "Independent samples t-test",
        "path": "Analyze → Compare means and proportions → Independent samples t-test",
        "intro": "Compare respondent age between the two observed gender categories in this ESS dataset. This is an illustration of the dialog, not a substantive population claim.",
        "image": "independentsamplesttest",
        "caption": "F3_agea is the test variable and F2_gndr the grouping variable.",
        "steps": [
            "Select <strong>ess</strong>.",
            "Choose <strong>F3_agea</strong> under Test variable and <strong>F2_gndr</strong> under Group variable.",
            "Choose <strong>Two-sided</strong> and a confidence level of <strong>95%</strong>.",
            "Leave <strong>Homogeneity of variance test</strong> selected for the illustrated setup, then click <strong>Run</strong>."
        ],
        "body": "<h3>Variance and direction</h3><p>With the homogeneity test enabled, the analysis handles the equal-variance decision. Disable it to make the decision yourself under <strong>Assume equal variances</strong>.</p><p>Use a grouping variable with two observed groups. Directional alternatives depend on which group is treated as first; check the group order before selecting a direction. This procedure is for independent groups, not paired measurements.</p>",
        "result": "The displayed means are 47.87 for Male and 50.55 for Female. The confidence interval describes the first group’s mean minus the second: about −4.40 to −0.95 years. The reported p-value is 0.002415. These are ordinary unweighted comparisons of the supplied cases, not a full ESS survey-design analysis.",
        "after": "{{figure:independentsamplesttest-output|Actual output: the variance-homogeneity procedure selected Welch’s two-sample t-test.}}<p>The active filter applies. Split groups and frequency weighting do not apply to this dialog.</p>"
    },
    {
        "id": "anovahv",
        "title": "One-way ANOVA",
        "path": "Analyze → Compare means and proportions → One-way ANOVA",
        "intro": "Compare age across respondents’ descriptions of their residential area. The ESS variable F14_domicil distinguishes a big city, suburbs, towns, villages, and countryside homes.",
        "image": "anovahv",
        "caption": "F3_agea is the response and F14_domicil supplies the groups.",
        "steps": [
            "Select <strong>ess</strong>.",
            "Choose <strong>F3_agea</strong> as Response variable and <strong>F14_domicil</strong> as Group variable.",
            "Leave Homogeneity of variance test enabled, or disable it to choose the variance assumption yourself.",
            "Select Numerical summaries when you want descriptive information with the test.",
            "Click <strong>Run</strong>. Enable Pairwise comparisons of means only when you need comparisons of particular groups."
        ],
        "body": "<h3>Pairwise comparisons</h3><p>The adjustment selector becomes available when pairwise comparisons are enabled. Bonferroni is the default. Report the adjustment method when reporting those comparisons.</p><p>The pairwise procedure uses its own defaults; changing the main ANOVA variance choice or confidence level does not automatically change those comparisons.</p>",
        "result": "The output shows the overall test and the mean, standard deviation, and sample size for each residential category. The countryside-home category has only 10 valid cases, much fewer than the others. The overall p-value does not identify which pairs differ; use the appropriate pairwise procedure for that question.",
        "after": "{{figure:anovahv-output|Actual ANOVA and group summaries for age by residential area.}}<p>Active filters and split groups apply. Frequency weighting does not.</p>"
    },
    {
        "id": "bivariate",
        "title": "Bivariate correlation",
        "path": "Analyze → Correlate → Bivariate",
        "intro": "Test the association between one pair of numeric variables.",
        "steps": [
            "Select a dataset, then select exactly two numeric variables in the <strong>Variables</strong> list. Selected variables stay pinned at the top. Once two are selected, the remaining variables are disabled. Deselect either variable to choose another; type in the list to search.",
            "Choose <strong>Pearson</strong>, <strong>Spearman</strong>, or <strong>Kendall</strong>.",
            "Leave <strong>Not equal to zero</strong> selected for a two-sided test. Choose <strong>Greater than zero</strong> or <strong>Less than zero</strong> for a positive or negative directional alternative.",
            "For Pearson, set the confidence level, normally <strong>95%</strong>. Click <strong>Run</strong>."
        ],
        "body": "<p>Pearson measures linear association; Spearman and Kendall use ranks. All three test a null value of zero. Cases missing either selected variable, including values stored as declared missing, are excluded together. Categorical variables cannot be selected.</p><p>The confidence level applies only to Pearson. Its confidence interval requires at least four complete pairs; the Pearson test itself needs at least three. Rank tests use R’s default p-value calculation. When ties prevent an exact calculation, R may report a warning and use an approximation.</p>",
        "result": "Read the estimated correlation, test statistic, p-value, and alternative hypothesis. Pearson also reports a confidence interval when enough complete pairs are available. Constant variables or too few usable observations cannot give a meaningful test; inspect any R warning or error.",
        "after": "<p>An active filter applies. Split groups and frequency weights do not apply to this dialog. Reset restores the dialog choices and does not alter the dataset. See the <a href=\"commands.html#correlation\">generated-command example</a> and the <a href=\"https://stat.ethz.ch/R-manual/R-devel/library/stats/html/cor.test.html\">R correlation-test documentation</a>.</p>"
    },
    {
        "id": "goto",
        "title": "Go to a case or variable",
        "path": "Dataset editor → Go to…",
        "intro": "Jump to a column or row in the active dataset without scrolling through the whole table.",
        "image": "goto",
        "caption": "Choose Variable to find a column, or Case to enter a row number.",
        "steps": [
            "Open the dataset editor’s Go to dialog.",
            "Choose <strong>Variable</strong>, type part of a variable name in the search field, and select the matching variable. Or choose <strong>Case</strong> and enter a row number, starting from 1.",
            "Click <strong>Go</strong>."
        ],
        "result": "The editor moves to that position. This is navigation only: it does not select a subset for analysis or change any values."
    },
    {
        "id": "dataset-state",
        "title": "Filters, groups, and weights",
        "intro": "These settings stay with the selected dataset. They can explain why a result differs from a table you produced earlier.",
        "body": "<ul><li><strong>Filter:</strong> analyse only cases that meet a condition while retaining the original data.</li><li><strong>Split groups:</strong> repeat a supported analysis separately for each group.</li><li><strong>Frequency weight:</strong> let a row represent several occurrences in supported procedures.</li></ul><div class=\"table-scroll\"><table><thead><tr><th>Procedure</th><th>Filter</th><th>Split groups</th><th>Frequency weight</th></tr></thead><tbody><tr><td>Add cases and Add variables</td><td>Yes, for each source</td><td>No</td><td>No</td></tr><tr><td>Frequency and contingency tables</td><td>Yes</td><td>Yes</td><td>Yes</td></tr><tr><td>Numerical summaries</td><td>Yes</td><td>Yes</td><td>Supported measures</td></tr><tr><td>One-sample and independent-samples t-tests</td><td>Yes</td><td>No</td><td>No</td></tr><tr><td>Bivariate correlation</td><td>Yes</td><td>No</td><td>No</td></tr><tr><td>One-way ANOVA</td><td>Yes</td><td>Yes</td><td>No</td></tr></tbody></table></div><h3>Return to all cases without grouping or weights</h3><ol class=\"steps\"><li>In <strong>Subset cases and variables</strong>, select ess, choose <strong>All cases</strong>, and click <strong>OK</strong>.</li><li>In <strong>Split by groups</strong>, select the dataset and click <strong>Reset</strong>.</li><li>In <strong>Apply frequency weighting</strong>, select the dataset and click <strong>Reset</strong>.</li></ol><p>Removing a filter does not restore previously deleted cases. Recoding and sorting act on the underlying dataset rather than only the filtered view. Create a new subset first when a transformation should affect selected cases alone.</p>"
    },
    {
        "id": "commands",
        "title": "Send a command to the syntax tab",
        "intro": "Like SPSS’s Paste command to syntax workflow, DialogR lets you keep the command built from your dialog choices. You do not need to type it yourself.",
        "body": "<p>Sending a command to the editor does not run the analysis. Use <strong>Run</strong> in the dialog when you want results immediately. The left-hand action in the contextual menu, <strong>Copy</strong>, copies the command to the clipboard.</p><p>The generated command can help you keep a record, repeat an analysis, or gradually learn R. Reading it is optional. The subset dialog is an exception in that its condition field accepts a short expression, explained in that chapter.</p><p><a class=\"button\" href=\"commands.html\">Open the optional R reference →</a></p><p>The reference explains package relationships, command structure, and examples. It is separate from the step-by-step instructions so you can consult it when it is useful.</p>",
        "image": "send-to-syntax",
        "caption": "Hover at the top centre of the dialog to reveal the contextual menu. The right-hand action sends the command to the Script Editor.",
        "steps": [
            "Choose your dataset, variables, and options in the analysis dialog.",
            "Move the mouse over the <strong>middle of the top edge</strong> of the dialog. A small contextual menu appears.",
            "Click the <strong>right-hand icon</strong>, labelled <strong>Send to Script Editor</strong>.",
            "The generated command is inserted into the Script Editor (the syntax tab). Keep it with your other commands and save the script when you want to repeat the analysis later."
        ]
    },
    {
        "id": "troubleshooting",
        "title": "Troubleshooting and saving your work",
        "intro": "Start with the dialog’s message and the dataset settings. Most unexpected results can be traced to an input choice, missing value, or active filter, group, or weight.",
        "body": "<h3>A dialog cannot run</h3><p>Wait for the runtime to finish starting. Select a dataset and all required variables. If a package is missing or outdated, follow <a href=\"#packages\">Set up DialogR</a>.</p><h3>Results differ from the example</h3><p>Use <strong>roda-ess9-v1-en.rds</strong> from the <a href=\"https://roda.ro/studies/roda-ess9?lang=en\">RODA catalogue record</a>, then check the <a href=\"#dataset-state\">filter, grouping, and weight settings</a>. Check declared missing-value definitions and confirm that you chose the same variable and did not change the original data.</p><h3>A variable is missing</h3><p>Select the correct dataset. A subset may have excluded the column you need. Check its name and type in the Variables view.</p><h3>WebR is slow</h3><p>Allow the browser runtime and package library to finish loading. WebR can use the same dataset as desktop DialogR; loading, importing, and analysing it will simply take longer. Use desktop DialogR when you prefer faster repeated work.</p><h3>Keep the original data</h3><p>Keep a copy of your input file. Use new-dataset and new-variable options for transformations when you want to preserve the originals. Save datasets or the workspace explicitly; do not rely on an open browser tab.</p><p>You may also keep generated commands in a script to repeat your work later. A script records instructions, not a copy of every dataset. For a reproducible problem, <a href=\"https://github.com/RODA/DialogR/issues\">report an issue</a> with the dialog name, version, exact message, and a small non-confidential example.</p>"
    }
];
