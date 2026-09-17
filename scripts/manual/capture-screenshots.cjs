"use strict";

// Capture the real desktop interface in a separate, disposable user profile.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const root = path.resolve(__dirname, "../..");
const forge = path.resolve(root, "../DialogForge");
const { _electron } = require(path.join(forge, "node_modules/playwright"));
const { findMainWindowPage } = require(path.join(forge, "tests/electron/product-launch"));
const output = path.join(root, "docs/images/manual");
const helpersOnly = process.env.DIALOGR_MANUAL_HELPERS_ONLY === "1";

async function run() {
    fs.mkdirSync(output, { recursive: true });
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), "dialogr-manual-"));
    const app = await _electron.launch({
        executablePath: require(path.join(forge, "node_modules/electron")),
        args: [path.join(root, "dist/scripts/electron-main.js"), "--product-path", root],
        cwd: root,
        env: { ...process.env, DIALOGFORGE_TEST_USER_DATA_PATH: profile }
    });

    try {
        const main = await findMainWindowPage(app);
        const mainWindow = await app.browserWindow(main);
        await mainWindow.evaluate(window => window.setSize(880, 720));
        await main.waitForFunction(() => document.body.dataset.dialogForgeReady === "1", null, { timeout: 60000 });
        await main.waitForFunction(() => document.querySelector('#consoleTerminal [data-session-phase="ready"]'), null, { timeout: 60000 });
        const source = process.env.DIALOGR_MANUAL_DATA || path.join(os.homedir(), "ess9en.rds");
        const setup = 'library(declared); ess <- readRDS(' + JSON.stringify(source) + '); stopifnot(all(vapply(ess[c("B1_polintr", "B7_trstlgl", "F2_gndr", "F3_agea", "F14_domicil", "fweight")], inherits, logical(1), "declared")))';
        await main.evaluate(async command => {
            const view = document.getElementById("visibleCommandInput").dialogForgeConsoleInputView;
            view.setText(command);
            await view.submit();
        }, setup);
        await main.waitForFunction(async () => (await window.dialogForge.refreshWorkspace()).objects.some(o => o.name === "ess"), null, { timeout: 30000 });
        await main.evaluate(() => window.dialogForge.setActiveDataset("ess"));
        console.log("ESS dataset ready with declared variables");

        if (!helpersOnly) {
        await main.evaluate(() => window.dialogForge.openDatasetEditor("ess"));
        console.log("Windows:", app.windows().map(page => page.url()));
        const editor = app.windows().find(page => /dataset.*editor/i.test(page.url()));
        if (!editor) {
            throw new Error("Dataset editor window not found");
        }
        const editorWindow = await app.browserWindow(editor);
        await editorWindow.evaluate(window => window.setSize(900, 560));
        await editor.locator("#datasetEditorTabVariables").waitFor();
        await editor.waitForTimeout(1500);
        const interestHeader = editor.locator('#datasetEditorPanelData th').filter({ hasText: 'B1_polintr' }).first();
        if (await interestHeader.count()) {
            await interestHeader.scrollIntoViewIfNeeded();
        }
        await editor.screenshot({ path: path.join(output, "data-view.png") });
        await editor.locator("#datasetEditorTabVariables").click();
        await editor.waitForTimeout(500);
        await editor.locator('[data-variable-values-editor="12"]').scrollIntoViewIfNeeded();
        await editor.screenshot({ path: path.join(output, "variable-view.png") });
        await editor.locator('[data-variable-cell="values"][data-variable-row="12"]').click();
        await editor.locator('[data-variable-values-editor="12"]').dispatchEvent("click");
        await editor.locator('#datasetValueLabelsModal').waitFor({ state: 'visible' });
        await editor.locator('#datasetValueLabelsModal .dataset-modal__dialog').screenshot({ path: path.join(output, 'declared-missing.png') });
        await editor.locator('#datasetValueLabelsCancel').click();
        }

        const selections = {
            frequencies: { c_variables: "B1_polintr" },
            crosstable: { c_rows: "B1_polintr", c_cols: "F2_gndr" },
            summaries: { c_variables: "B7_trstlgl" },
            onesamplettest: { c_variables: "F3_agea" },
            independentsamplesttest: { c_testvar: "F3_agea", c_groupvar: "F2_gndr" },
            anovahv: { c_testvar: "F3_agea", c_groupvar: "F14_domicil" },
            recode: { c_variables: "F3_agea" },
            sortby: { c_variables: "F3_agea" },
            splitby: { c_variables: "F2_gndr" },
            weightby: { c_variables: "fweight" },
            select: {},
            goto: {},
            import: {}
        };
        const manifest = [];
        for (const [id, controls] of Object.entries(selections)) {
            if (helpersOnly && id !== "frequencies") continue;
            const pending = app.waitForEvent("window", { timeout: 15000 });
            const opened = await main.evaluate(id => window.dialogForge.openProductDialog(id), id);
            if (opened.status !== "opened") {
                throw new Error(id + ": " + JSON.stringify(opened));
            }
            const page = await pending;
            await page.locator("#paper .dm-el").first().waitFor();
            await page.waitForTimeout(500);
            const dataset = page.locator('[data-control-name="c_datasets"] .container-item[data-value="ess"]');
            if (await dataset.count()) {
                await dataset.click();
            }
            for (const [name, value] of Object.entries(controls)) {
                await page.locator('[data-control-name="' + name + '"] .container-item[data-value="' + value + '"]').first().click();
            }
            const fill = async (name, value) => {
                const control = page.locator('[data-control-name="' + name + '"] textarea, [data-control-name="' + name + '"] input').first();
                await control.fill(value);
                await control.press("Tab");
            };
            const click = name => page.locator('[data-control-name="' + name + '"]').click();
            if (["sortby", "splitby", "weightby"].includes(id)) {
                await click("addremove");
            }
            if (id === "sortby") {
                await click("cb_new");
                await fill("dsname", "ess_sorted");
            }
            if (id === "onesamplettest") {
                await fill("mu", "50");
            }
            if (id === "summaries") {
                await click("cb_summary");
            }
            if (id === "select") {
                await click("rd_new");
                await fill("expression", 'F2_gndr == "Female"');
                await fill("newname", "essf");
            }
            if (id === "recode") {
                await click("checkbox1");
                await fill("i_newvar", "agerec");
                await page.locator('[data-control-name="i_lowesto"] textarea').click();
                await fill("i_lowesto", "44");
                await fill("i_value_new", "1");
                await click("b_add");
                await page.locator('[data-control-name="i_tohighest"] textarea').click();
                await fill("i_tohighest", "45");
                await fill("i_value_new", "2");
                await click("b_add");
            }
            if (id === "import") {
                await fill("input1", source);
                await fill("input2", "ess");
            }
            if (id === "frequencies") {
                await click("cb_vlabel");
                const variables = page.locator('[data-control-name="c_variables"]');
                await variables.hover();
                await page.keyboard.press(process.platform === "darwin" ? "Meta+f" : "Control+f");
                await page.locator('.preview-container-search-input').fill("trstlgl");
                await page.locator("#paper").screenshot({ path: path.join(output, "variable-search.png") });
                await page.keyboard.press("Escape");
                await page.mouse.move(5, 5);
                await page.locator("#paper").screenshot({ path: path.join(output, "selected-variables.png") });
                await page.locator("#dialogQuickActionsHotspot").hover();
                await page.locator("#dialogSendToScriptEditor").hover();
                await page.waitForTimeout(400);
                await page.screenshot({ path: path.join(output, "send-to-syntax.png") });
                if (helpersOnly) {
                    console.log("Captured variable pinning, search, and Send to Script Editor controls");
                    await page.close();
                    continue;
                }
                await page.mouse.move(5, 5);
            }
            await page.waitForTimeout(350);
            await page.locator("#paper").screenshot({ path: path.join(output, id + ".png") });
            manifest.push({ id, text: await page.locator("#paper").innerText() });
            console.log("Captured " + id);
            if (["frequencies", "summaries", "onesamplettest", "independentsamplesttest", "anovahv", "crosstable"].includes(id)) {
                await click("b_run");
                await main.waitForTimeout(1500);
                await main.waitForFunction(() => {
                    const rows = document.querySelectorAll('[data-execution-id]');
                    return rows.length && rows[rows.length - 1].children.length > 1;
                }, null, { timeout: 30000 });
                const result = main.locator('[data-execution-id]').last().locator(':scope > div').last();
                const resultText = await result.innerText();
                if (/Error|could not find function/.test(resultText)) {
                    throw new Error(id + " failed: " + resultText);
                }
                await result.scrollIntoViewIfNeeded();
                const clip = await result.evaluate(node => {
                    const box = node.getBoundingClientRect();
                    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
                    let right = box.left;
                    let text;
                    while ((text = walker.nextNode())) {
                        const range = document.createRange();
                        range.selectNodeContents(text);
                        right = Math.max(right, range.getBoundingClientRect().right);
                    }
                    return { x: box.left + scrollX, y: box.top + scrollY, width: Math.min(box.width, right - box.left + 16), height: box.height };
                });
                await main.screenshot({ path: path.join(output, id + '-output.png'), clip });
                manifest[manifest.length - 1].result = resultText;
                console.log("Captured " + id + " output");
            }
            if (["splitby", "weightby"].includes(id)) {
                await click("b_reset");
            }
            await page.close();
        }
        if (!helpersOnly) fs.writeFileSync(path.join(root, "scripts/manual/capture-notes.json"), JSON.stringify(manifest, null, 2) + "\n");
    }
    finally {
        await app.close();
    }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
