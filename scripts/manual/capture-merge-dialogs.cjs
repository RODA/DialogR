"use strict";

// Capture actual native dialogs and verify the results using the public sample files.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../..");
const forge = path.resolve(process.env.DIALOGFORGE_ROOT || path.join(root, "../DialogForge"));
const { _electron } = require(path.join(forge, "node_modules/playwright"));
const { findMainWindowPage, closeTestApplication } = require(path.join(forge, "tests/electron/product-launch"));
const output = path.join(root, "docs/images/manual");
const menu = JSON.parse(fs.readFileSync(path.join(root, "menu/menu.json")));

function menuItem(items, dialog) {
    for (const item of items) {
        if (item.dialog === dialog) {
            return item.id;
        }
        const found = menuItem(item.items || [], dialog);
        if (found) {
            return found;
        }
    }
}

async function capture() {
    fs.mkdirSync(output, { recursive: true });
    const staged = spawnSync(process.execPath, [
        path.join(forge, "dist/scripts/package-product.js"), "--product-path", root, "--stage-only"
    ], { cwd: forge, stdio: "inherit" });
    assert.equal(staged.status, 0, "Stage the current product before capture");
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), "dialogr-manual-merges-"));
    let app;
    const errors = [];
    const captures = [];

    try {
        app = await _electron.launch({
            executablePath: require(path.join(forge, "node_modules/electron")),
            args: [
                ...(process.platform === "win32" ? ["--disable-gpu"] : []),
                path.join(forge, "dist/scripts/electron-main.js"), "--product-path", root
            ],
            cwd: forge,
            env: { ...process.env, DIALOGFORGE_TEST_USER_DATA_PATH: profile }
        });
        app.on("window", page => {
            page.on("pageerror", error => errors.push(error.message));
            page.on("console", message => {
                if (message.type() === "error") {
                    errors.push(message.text());
                }
            });
        });
        const main = await findMainWindowPage(app);
        const runR = async command => {
            await main.waitForFunction(() => {
                return document.getElementById("visibleCommandInput")?.dialogForgeConsoleInputView &&
                    Array.from(document.querySelectorAll('[data-session-phase="ready"]'))
                        .some(node => node.dataset.runtimeBusy !== "true");
            }, null, { timeout: 120000 });
            await main.evaluate(async command => {
                const input = document.getElementById("visibleCommandInput").dialogForgeConsoleInputView;
                input.setText(command);
                await input.submit();
            }, command);
        };
        const setup = ["respondents", "later", "regions", "notes"].map(name => {
            return name + " <- read.csv(" + JSON.stringify(path.join(root, "docs/examples", name + ".csv")) + ")";
        }).join("; ");
        await runR(setup + '; cat("MANUAL_MERGE_READY\\n")');
        await main.getByText("MANUAL_MERGE_READY", { exact: true }).waitFor();

        const control = (page, name) => page.locator('[data-control-name="' + name + '"]').first();
        const choose = async (page, name, value) => {
            const row = control(page, name).locator(".container-item").filter({ has: page.getByText(value, { exact: true }) });
            await row.waitFor();
            if (!await row.evaluate(node => node.classList.contains("active"))) {
                await row.click();
            }
        };
        const click = (page, name) => control(page, name).locator(".smart-button,.custom-checkbox,.custom-radio").first().click();
        const fill = async (page, name, text) => {
            const input = control(page, name).locator('textarea,input:not([type="radio"])');
            await input.fill(text);
            await input.press("Tab");
        };
        const open = async id => {
            const pending = app.waitForEvent("window");
            await app.evaluate(({ Menu }, id) => {
                const item = Menu.getApplicationMenu().getMenuItemById(id);
                if (!item?.enabled) {
                    throw new Error("Merge menu is unavailable");
                }
                item.click();
            }, menuItem(menu, id));
            const page = await pending;
            await page.locator("#paper [data-control-name]").first().waitFor();
            return page;
        };
        const saveAndRun = async (page, image, assertion) => {
            await page.locator("#paper").click({ position: { x: 5, y: 5 } });
            await page.mouse.move(0, 0);
            await page.evaluate(async () => {
                await document.fonts.ready;
                await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            });
            await page.locator("#paper").screenshot({ path: path.join(output, image + ".png") });
            const completed = page.waitForEvent("close");
            await click(page, "b_run");
            await completed;
            const marker = "MANUAL_" + image.replaceAll("-", "_") + "_PASS";
            await runR(assertion + '; cat("' + marker + '\\n")');
            await main.getByText(marker, { exact: true }).waitFor();
            captures.push({ image, assertion, verified: true });
            console.log("Captured and verified " + image);
        };

        let page = await open("addcases");
        await click(page, "checkbox1");
        await fill(page, "newdataset", "survey_all");
        await choose(page, "dataset1", "respondents");
        await choose(page, "dataset2", "later");
        await choose(page, "c_unpaired", "(2) mode");
        await click(page, "button1");
        await saveAndRun(page, "addcases", 'stopifnot(identical(survey_all$id, 1:6), identical(names(survey_all), c("id", "age", "region", "mode")), all(is.na(survey_all$mode[1:4])), identical(survey_all$mode[5:6], c("phone", "online")), nrow(respondents) == 4)');

        page = await open("addvariables");
        await choose(page, "dataset1", "respondents");
        await choose(page, "dataset2", "regions");
        await choose(page, "c_keys", "region");
        await choose(page, "c_excluded", "(2) internal_note");
        await click(page, "lookup2");
        await click(page, "new_dataset");
        await fill(page, "newdataset", "survey_named");
        await saveAndRun(page, "addvariables", 'stopifnot(identical(survey_named$id, c(1L, 3L, 2L, 4L)), identical(survey_named$region_name, c("North", "North", "South", NA_character_)), !"internal_note" %in% names(survey_named), nrow(respondents) == 4)');

        page = await open("addvariables");
        await click(page, "b_reset");
        await choose(page, "dataset1", "respondents");
        await choose(page, "dataset2", "notes");
        await click(page, "by_order");
        await click(page, "new_dataset");
        await fill(page, "newdataset", "survey_notes");
        await saveAndRun(page, "addvariables-order", 'stopifnot(identical(survey_notes$id, 1:4), identical(survey_notes$reviewed, c("yes", "no", "yes", NA_character_)))');
        assert.deepEqual(errors, [], "Capture must not hide renderer errors");
        fs.writeFileSync(path.join(__dirname, "merge-capture-notes.json"), JSON.stringify(captures, null, 4) + "\n");
    } finally {
        if (app) {
            await closeTestApplication(app, 10000);
        }
        fs.rmSync(profile, { recursive: true, force: true });
    }
}

capture().catch(error => { console.error(error); process.exitCode = 1; });
