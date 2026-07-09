# Adding DialogR Dialogs

This document describes how to add a DialogR product dialog. DialogR is a
DialogForge product repository, so DialogR owns its dialogs, menu entries,
capabilities, translations, and product tests.

Do not add DialogR dialogs to the DialogForge shared dialog tree. Start
DialogForge with this repository selected when you want the development import
workflow to write DialogR source files.

## Source Layout

DialogR dialogs live under:

```text
dialogs/r/<dialog-id>/
    dialog.json
    actions.js
```

The registry is:

```text
dialogs/dialogs.json
```

DialogR uses the `r` provider bucket because these dialogs produce R commands
and use the R runtime provider.

`<dialog-id>` should match `properties.name` in `dialog.json`. Use a stable
identifier-style name: letters, numbers, and underscores, with no leading digit.
Existing DialogR examples include `select`, `sortby`, `frequencies`, and
`onesamplettest`.

## Starting From DialogCreator

Create or edit the dialog in DialogCreator and save it as a `.dc.zip` package.
The package is the exchange format. It must not be replaced by a loose `.json`
file.

The package should contain:

- `dialog.json`;
- `actions.js`;
- optional dialog-local support files.

When imported in product development mode, DialogForge unpacks the package into
`dialogs/r/<dialog-id>/` and updates `dialogs/dialogs.json`.

## Manual Import

If you unpack manually, create this directory:

```text
dialogs/r/<dialog-id>/
```

Then place:

```text
dialogs/r/<dialog-id>/dialog.json
dialogs/r/<dialog-id>/actions.js
```

Keep dialog-specific helpers inside that same directory unless they are reused
by multiple DialogR dialogs. Shared DialogR dialog helpers belong under
DialogR-owned dialog helper locations, not under DialogForge shared code.

## Registry Entry

Add an entry to `dialogs/dialogs.json`.

Use this shape:

```json
{
    "id": "exampleDialog",
    "label": "Example dialog",
    "owner": "products/DialogR",
    "targetHome": "products/DialogR/dialogs/r/exampleDialog/",
    "sourceReference": "DialogCreator package or source note",
    "sourceFile": "r/exampleDialog/dialog.json",
    "status": "source-imported",
    "replacement": "Run through the DialogCreator-compatible DialogForge dialog runtime."
}
```

If the dialog requires packages directly, prefer defining them on the matching
capability in `capabilities/product-capabilities.json`. Existing package-heavy
dialogs, such as `frequencies` and `summaries`, declare their R package
requirements there.

## Menu Placement

DialogR menu entries live in:

```text
menu/menu.json
```

Use `type: "product-dialog"` and set `dialog` to the dialog registry ID.

Choose the top-level menu by user workflow:

- `Data` for data preparation and active-dataset operations;
- `Transform` for variable transformations;
- `Analyze` for statistical procedures;
- nested Analyze submenus for families such as descriptive statistics or tests.

Example:

```json
{
    "id": "DialogRExampleDialog",
    "labelKey": "menu.root.analyze.example_dialog",
    "label": "Example dialog",
    "type": "product-dialog",
    "dialog": "exampleDialog",
    "capability": "DialogR.dialog.exampleDialog"
}
```

`id` is the menu item ID. `dialog` is the dialog ID from `dialogs/dialogs.json`.
Keep them distinct.

## Product Capabilities

Add a matching capability to:

```text
capabilities/product-capabilities.json
```

DialogR capability names use this pattern:

```text
DialogR.dialog.<dialog-id>
```

Example:

```json
{
    "capability": "DialogR.dialog.exampleDialog",
    "label": "Example dialog",
    "runtimePrerequisites": [
        {
            "provider": "r",
            "kind": "package",
            "name": ["admisc", "declared"]
        }
    ]
}
```

The capability entry describes the DialogR feature and any explicit runtime
prerequisites. Keep this entry in product language: the dialog name, its label,
and the packages or provider-specific prerequisites it needs. DialogForge derives
and validates its lower-level runtime requirements from the dialog package,
product metadata, and runtime provider contract.

Add package prerequisites only when the dialog actually needs them. Future
non-R runtime providers can use their own provider and prerequisite kind.

## Translations

The menu item should have a stable `labelKey`. Add that key to each DialogR
locale file under:

```text
i18n/*.json
```

Dialog-local labels and control text belong in the dialog package's `dialog.json`
`i18n` section. Product menu labels belong in DialogR locale files.

## Product-Specific Behavior

Dialog behavior belongs in `actions.js` when it is local to one dialog.

If the dialog needs DialogR product services, such as dataset state, product
external calls, or custom preview behavior, route through DialogR-owned
product modules and existing dialog external-call conventions. Do not call
Electron IPC, DOM internals outside the dialog runtime, or DialogForge private
implementation files directly from `actions.js`.

If new shared DialogR dialog behavior is needed, add it as a product-owned
helper and test it. Promote code to DialogForge shared code only when it is
truly reusable outside DialogR.

## Editor Help For `dialog.json`

DialogCreator is the preferred place to design and edit dialogs. If you inspect
or adjust a `dialog.json` file in VS Code, attach DialogForge's schema so the
editor can show field names, descriptions, and basic mistakes while you type.

For a DialogR checkout next to DialogForge, add this to `.vscode/settings.json`:

```json
{
    "json.schemas": [
        {
            "fileMatch": ["dialogs/**/dialog.json"],
            "url": "../DialogForge/schemas/dialog.schema.json"
        }
    ]
}
```

If your folders are arranged differently, keep `fileMatch` the same and adjust
only the `url` so it points to DialogForge's `schemas/dialog.schema.json`.

DialogR still validates registered dialog files during `npm run check` and when
DialogForge stages the product.

## When You Need The DialogForge SDK

Most DialogR dialog authors do not need the SDK. If you are adding a dialog,
editing dialog labels, changing menu placement, or declaring package
prerequisites, stay in the dialog, menu, capability, and locale files described
above.

Use the SDK only when you edit DialogR's product wiring, especially:

- `bootstrap/productContribution.ts`;
- product-level external calls;
- product-level console state chips;
- product-level runtime method calls.

The SDK gives TypeScript and editors the public DialogForge product contract.
It keeps DialogR code away from DialogForge private `shared/` implementation
files.

From the DialogForge repository, build or refresh the SDK:

```sh
npm run sdk:core
```

This creates the local package:

```text
DialogForge/dist/sdk/core
```

DialogR's `package.json` should point `@dialogforge/core` at that local package:

```json
{
    "devDependencies": {
        "@dialogforge/core": "file:../DialogForge/dist/sdk/core"
    }
}
```

If your folders are not siblings, adjust the relative path so it points to the
same `dist/sdk/core` directory.

After changing or refreshing that dependency, run this from the DialogR
repository:

```sh
npm install
```

Then `bootstrap/productContribution.ts` can import the public SDK:

```ts
import {
    PRODUCT_CONTRIBUTION_CONTRACT_VERSION,
    type ProductContribution
} from "@dialogforge/core";

export const productContribution: ProductContribution = {
    id: "DialogR",
    dialogForgeProductContract: PRODUCT_CONTRIBUTION_CONTRACT_VERSION,
    createDialogExternalCallHosts: function() {
        return {};
    }
};
```

When the contribution changes, check it from DialogR:

```sh
npm run check
```

Then start DialogForge with DialogR selected:

```sh
npm run dev:product -- /path/to/DialogR
```

For agents: use `@dialogforge/core` for product contribution types and the
contract version. Do not reintroduce imports from DialogForge private `shared/`
paths for this product boundary.

## Menu Customization In Development

When DialogForge is started with this repository selected, menu customization's
Browse action imports `.dc.zip` packages into this repository. It should create
or update:

```text
dialogs/r/<dialog-id>/
dialogs/dialogs.json
```

Review those changes before committing. The UI can help place a menu item, but
the committed source of truth is still `menu/menu.json`, not a user-local menu
customization file.

## Validation

After adding a dialog, run:

```sh
npm run check
```

For rendered behavior, use the product electron dialog verifier when needed:

```sh
npm run verify:electron-dialog
```

Also check the relevant dialog-runtime tests under `tests/dialog-runtime/`.
If the new dialog adds product-specific external calls or reusable helpers, add
focused product tests under `tests/products/` or `tests/dialog-runtime/`.

## Review Checklist

Before committing:

- `dialogs/r/<dialog-id>/dialog.json` exists;
- `dialogs/r/<dialog-id>/actions.js` exists;
- `dialogs/dialogs.json` has the dialog ID and correct `sourceFile`;
- `menu/menu.json` has a `product-dialog` entry where DialogR users expect it;
- `capabilities/product-capabilities.json` has the matching capability;
- menu `labelKey` values exist in `i18n/*.json`;
- runtime prerequisites are declared on the capability when needed;
- DialogR product tests cover any new non-trivial behavior.
