# DialogR website

The product website is a static site in `docs/`, following DialogCreator's
paper, ink, blue, and Inter typography. It requires no build step or third-party
JavaScript. GitHub Pages publishes `main /docs` at
<https://roda.github.io/DialogR/>.

- `index.html`: product overview with actual dialog screenshots and declared-data features.
- `download.html`: platform release links, desktop package setup, and WebR.
- `usermanual.html`: searchable, linkable manual; all content also works without
  JavaScript, and print styles include every chapter regardless of search state.
- `css/site.css`: shared responsive layout and print rules.
- `commands.html`: optional command and package reference, separate from the task-based manual.
- `scripts/site.js`: manual search and screenshot enlargement.
- `images/manual/`: 25 captures of the actual application, including statistical output,
  variable pinning and search, and the contextual Send to Script Editor action.
- `images/dialogr.svg`: the existing product icon.
- `fonts/`: Inter Regular and Bold with their SIL Open Font License.

Preview from the repository root:

```sh
python3 -m http.server 4186 --bind 127.0.0.1 --directory docs
```

## Updating the manual

Edit `scripts/manual/chapters.cjs`, then run
`node scripts/manual/build-html.js` to regenerate the manual and optional R
reference. Serving the generated website requires no build or dependencies.

The illustrated examples use a locally prepared European Social Survey Round 9
dataset for Romania, with 1,846 cases and 345 variables. Analysis variables
keep their `declared` classes, value labels, and missing definitions. The source
dataset is not redistributed with this site. Set `DIALOGR_MANUAL_DATA` to its
local path when recapturing. Examples are informed by the accompanying
descriptive and inferential teaching scripts.

`scripts/manual/capture-screenshots.cjs` captures an isolated instance of the
real Electron application using the sibling DialogForge Playwright/Electron
installation. It imports the prepared ESS file, captures dialog choices and
the missing-value editor, and runs six unweighted analyses for result captures.
See `scripts/manual/capture-notes.json` for captured controls and output.
Regenerate the HTML after recapturing images so image dimensions stay current.
Use `DIALOGR_MANUAL_HELPERS_ONLY=1 node scripts/manual/capture-screenshots.cjs`
to capture just the three dialog-workflow illustrations.

The current reference is based on product version 1.0.23. Check these sources
when behavior changes:

- `dialogs/dialogs.json` and `menu/menu.json`: coverage, names, menu paths.
- `dialogs/r/*/dialog.json` and `actions.js`: controls, defaults, command builders.
- `settings/settings.json`: package requirements and package-source policy.
- DialogForge `src/base-app/dialogs/source/import/actions.js`: import formats,
  options, and commands.
- DialogForge `src/dialog-runtime/custom-js/summaryBindings.ts`,
  `dialogBindings.ts`, and `dialogStateCallRouter.ts`: summaries and dataset state.
- DDIwR `R/internals.R`, `import_excel()`: supported workbook metadata layout.
- `package.json > product.releaseTags`: platform release destinations.
- `internal/web.env`: configured public browser application destination.

Each product dialog should retain a matching manual section ID. Keep the
filter/group/weight support table in sync with actual command construction.
Do not imply that Reset undoes executed data transformations.

The manual records the existing contingency-table exact-test issue:
`fischer.exact()` is emitted by the current dialog, whereas the standard R
function is `stats::fisher.test()`. Update that note when the application is
corrected. The Split dialog stores its sort preference; its state handler does
not itself execute a sort, so the manual directs explicit sorting to Sort cases.

## Verification performed

Run `node scripts/manual/verify-site.cjs` with the preview server running to
check all four pages at desktop and mobile widths, image loading, local links,
manual search, and screenshot enlargement. The screenshot capture run also
executes frequencies, a contingency table, summaries, both t-tests, and ANOVA.
These checks do not validate every statistical option or platform installer.
