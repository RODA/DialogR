# DialogR
An R product for the DialogForge

## Website and user manual

The [product website](docs/index.html), [user manual](docs/usermanual.html), and
[download and setup guide](docs/download.html) are in `docs/`. See
[website maintenance](docs/website.md) for local preview and documentation sources.

## Public NPM Scripts

Run these commands from the DialogR repository. DialogForge should normally be a
sibling checkout at `../DialogForge`; set `DIALOGFORGE_ROOT` when it is
somewhere else.

| Command | Public arguments | What it does |
| --- | --- | --- |
| `npm start` | optional `-- --forge-path <path>` | Builds and starts DialogR in Electron development mode with DevTools open, then restages and restarts it when product files change. Uses the sibling `../DialogForge` checkout by default or `DIALOGFORGE_ROOT` when set. |
| `npm run check` | none | Validates the DialogR product contribution and TypeScript sources, then runs the focused R package compatibility tests. |
| `npm run build` | macOS-only `--sign` | Runs `check`, then asks DialogForge to build/package DialogR for the current host OS. macOS builds are ad-hoc signed unless `--sign` is passed. |
| `npm run check:build-ownership` | none | Checks that DialogR keeps its product-owned build scripts and release request workflow. |
| `npm run webr:library` | optional `-- --force` | Downloads or refreshes DialogR WebR package-library assets. |
| `npm run webr:manifest` | none | Regenerates the installed-package manifest from the local WebR VFS metadata and data pair. |
| `npm run test:package-compatibility` | none | Verifies the shared structured-requirement contract, R version ordering/resolution, and the generated DialogR manifest. |
| `npm run verify:electron-dialog` | none | Runs the DialogR Electron dialog verification script. |
| `npm run dev:web` | optional `--port <number>` and `--host <address>` | Builds DialogForge's web runtime for DialogR and starts the local server, replacing an existing server on the selected port. |
| `npm run build:web` | none | Builds DialogForge's web runtime and DialogR web manifest without starting the server. |
| `npm run serve:web` | optional `--port <number>` and `--host <address>` | Serves the already-built DialogR web runtime without rebuilding DialogForge first. |
| `npm run verify:web-deployment` | optional base URL | Checks the expected DialogR web deployment endpoints. Defaults to `DIALOGR_WEB_URL` or `http://127.0.0.1:5173`. |
| `npm run fetch:intel` | none | Downloads the signed Intel macOS files from the `latest` release and expands the app for local notarization. |
| `npm run submit` | none | Submits the Apple Silicon and Intel DMGs to Apple's notary service and waits for acceptance. |
| `npm run history` | optional count | Shows recent submissions for the configured notary profile. |
| `npm run staple` | none | Staples both apps, rebuilds both updater ZIPs and blockmaps, refreshes their architecture-specific metadata, and staples both DMGs. |
| `npm run publish` | optional `-- --allow-unstapled` | Uploads both macOS architectures and their updater files to the existing `latest` release. |

The compiled desktop application is staged in this repository under `dist/`.
Installers, update metadata, and other release artifacts are written under
`build/output/`.

Developer ID macOS signing is opt-in with `npm run build -- --sign` when the
caller has a valid signing identity. Without `--sign`, macOS artifacts are
ad-hoc signed so the app bundle remains valid for local testing and updates,
but they are not notarized for Gatekeeper.

For a macOS release, build the signed Apple Silicon version locally, run
`npm run fetch:intel`, then `npm run submit`, `npm run staple`, and
`npm run publish`. The Intel workflow and local Apple Silicon build both target
the same `latest` release, while `latest-x64-mac.yml` and
`latest-arm64-mac.yml` keep their updater payloads separate.

Release tag names are required product settings in
`package.json > product.releaseTags`. For DialogR, the current values are
`linuxIntel=latest`, `windowsIntel=latest`, `macosIntel=latest`, `macosSilicon=latest`, and
`webrVFS=web`. These names and values are product-specific examples for this
repo and can differ across other products or user forks.

## Contributing Dialogs

See [docs/adding-dialogs.md](docs/adding-dialogs.md) for the DialogR procedure
for adding or editing dialogs, linking them to product menus, declaring runtime
capabilities, and validating product-specific behavior.
