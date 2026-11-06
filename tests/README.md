# DialogR release tests

Run from the DialogR checkout, with the matching DialogForge checkout beside it
(or set `DIALOGFORGE_ROOT`). Both repositories' changes are needed. Install
DialogForge dependencies, the Playwright Chromium/Firefox/WebKit browsers, and R
with the package versions declared in the dialog manifests (`admisc` 0.41.1 is
needed by the merge checks). Missing dependencies fail the tests; they are not
silently skipped.

Native CI uses R 4.6.1 to match the qualified native helpers pinned in
DialogForge. Update that version with the helper pins when changing R versions.
The native/R checks fail immediately if `admisc` does not export `addCases` at
version 0.41.1 or later. CI installs the published GitHub source at commit
`617ea614521a316553a74a02eb00deb7e43490b6`, rather than the older CRAN package.
To install the same dependencies locally (a source compiler is required):

```sh
Rscript scripts/install-test-r-dependencies.R statistics declared later jsonlite cli rlang
```

```sh
npm run test:release
npm run test:release -- --apps --web-build
```

The first command checks the product, all rendered dialogs on three browsers,
merge commands in real R, deliberate regression detection, and the shared
renderer controls/geometry. The second also compiles the native host, builds the
production WebR site, and exercises the actual native R and WebR applications.
Use `--apps` without `--web-build` only when testing a deliberately prebuilt web
artifact. Run native Electron tests under `xvfb-run -a` on headless Linux.
Platform packaging jobs set `DIALOGFORGE_DIST_DIR` to `product/dist`, the actual
build output. The native test launches the R binary belonging to its preflight
Rscript installation, so a second R installation cannot silently win discovery.
CI exports that executable for the packaged checks as well. Packaging runs after
R setup so the artifact contains a cache compiled by the qualified R version.
Each native application check first exercises uncached startup across the former
seven-second deadline, using real source compilation and helper negotiation.
Runtime startup failures are reported immediately rather than as readiness timeouts.

| Layer | What it verifies |
| --- | --- |
| Existing product checks | TypeScript, runtime/package compatibility, script references and behavior contracts |
| Rendered dialogs | Every registered dialog and locale, real custom actions, dataset population, Reset, empty workspaces, refresh after dataset removal; renderer/console errors fail |
| Recode interactions | Named radio-group callbacks, input-driven rules, add/remove, exact command submission and Reset clearing rules |
| Rendered merge workflows + R | Both lookup directions, inner merge, exclusions/key protection, duplicate-key rejection before assignment, row-order padding in either direction, empty datasets, a source named `rows`, output validation, Add cases schema/NA behavior and bidirectional transfers |
| Bivariate correlation + R | All three methods and alternatives, complete pairs and declared missing values, tied ranks, confidence validation, quoted names, numeric-only selection, Reset and workspace removal on all three browsers |
| Negative controls | Compile-only mutations restore the lost radio group and unintended selection events; tests must fail for the expected reason. Production files are never mutated |
| Shared renderer | Actual canonical controls, raw/cached schemas, named radio-group events, restoration, search, Choice identities, validation, attachments, typography and labels |
| Native R / WebR application | Real menus, dialogs, Run, package loading, dataset bindings, and R assertions of exact data for Recode and both merge dialogs; inputs and output are synthetic |

Reports and screenshots go to `artifacts/dialog-release/`; these files are ignored
by Git and retained as CI artifacts. `release-report.json` contains the aggregate
result, source fingerprints and timings. A failed run returns a nonzero exit.
Individual scripts also write reports on assertion failure. The two deliberately
broken child runs retain failed reports under `radio-regression` and
`selection-regression`; the parent regression-detection command passes only when
those children fail for the expected reason. Test instances use
isolated profiles; the native cleanup helper only stops the launched process
and its descendants, and does not inspect closed application windows.

The new CI workflow runs the rendered/R gate and actual Linux native/WebR flows.
The DialogQCA-specific Venn integration check stays outside the DialogR gate;
running this product's tests requires only DialogR and DialogForge checkouts.
The platform build workflows also run native dialog workflows, then all existing
packaged production smoke targets (menus, package readiness, console, help and
Script Editor/Live Script), before artifact/release upload. These jobs must use
the matching DialogForge revision. Configure the renderer/workflow checks as
required status checks through repository settings if branch protection is used.

This gate does not assert that every statistical result has been independently
validated. It supplements the existing per-dialog script tests with actual
renderer coverage and focused data-preservation workflows. Release qualification
still requires green platform jobs on the exact release commits, appropriate
signing/notarization checks, and testing the packaged artifact. Local native
checks prove the current host only; local passes do not establish remote CI,
Windows/Linux/Intel installer or signing readiness.

Run the existing broader artifact checks separately from the product directory:

```sh
npm run verify:production
```

This builds the desktop package and production web site, then checks the packaged
menus, package readiness, console, help and Script Editor, plus the production
browser host on all three engines. Use `-- --skip-build` only for artifacts you
deliberately built immediately beforehand. Packaging does not publish a release.
