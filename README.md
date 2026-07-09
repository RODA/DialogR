# DialogR
An R product for the DialogForge

## Public NPM Scripts

Run these commands from the DialogR repository. DialogForge should normally be a
sibling checkout at `../DialogForge`; set `DIALOGFORGE_ROOT` when it is
somewhere else.

| Command | Public arguments | What it does |
| --- | --- | --- |
| `npm start` | optional `-- --forge-path <path>` | Builds and starts DialogR in Electron development mode with DevTools open, then restages and restarts it when product files change. Uses the sibling `../DialogForge` checkout by default or `DIALOGFORGE_ROOT` when set. |
| `npm run check` | none | Validates the DialogR product contribution and TypeScript sources. |
| `npm run build` | macOS-only `--sign` | Runs `check`, then asks DialogForge to build/package DialogR for the current host OS. macOS builds are ad-hoc signed unless `--sign` is passed. |
| `npm run check:build-ownership` | none | Checks that DialogR keeps its product-owned build scripts and release request workflow. |
| `npm run webr:library` | optional `-- --force` | Downloads or refreshes DialogR WebR package-library assets. |
| `npm run verify:electron-dialog` | none | Runs the DialogR Electron dialog verification script. |
| `npm run dev:web` | optional `--port <number>` and `--host <address>` | Builds DialogForge's web runtime for DialogR and starts the local server, replacing an existing server on the selected port. |
| `npm run build:web` | none | Builds DialogForge's web runtime and DialogR web manifest without starting the server. |
| `npm run serve:web` | optional `--port <number>` and `--host <address>` | Serves the already-built DialogR web runtime without rebuilding DialogForge first. |
| `npm run verify:web-deployment` | optional base URL | Checks the expected DialogR web deployment endpoints. Defaults to `DIALOGR_WEB_URL` or `http://127.0.0.1:5173`. |

The compiled desktop application is staged in this repository under `dist/`.
Installers, update metadata, and other release artifacts are written under
`build/output/`.

Official notarization and release publication are maintainer-internal operations.
Developer ID macOS signing is opt-in with `npm run build -- --sign` when the
caller has a valid signing identity. Without `--sign`, macOS artifacts are
ad-hoc signed so the app bundle remains valid for local testing and updates,
but they are not notarized for Gatekeeper.

## Contributing Dialogs

See [docs/adding-dialogs.md](docs/adding-dialogs.md) for the DialogR procedure
for adding or editing dialogs, linking them to product menus, declaring runtime
capabilities, and validating product-specific behavior.
