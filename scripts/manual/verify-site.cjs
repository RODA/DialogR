"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { chromium } = require("../../../DialogForge/node_modules/playwright");
const root = path.resolve(__dirname, "../..");
const base = process.env.DIALOGR_SITE_URL || "http://127.0.0.1:4186";

(async () => {
    const browser = await chromium.launch();
    try {
        const errors = [];
        const page = await browser.newPage({ reducedMotion: "reduce" });
        page.on("pageerror", error => errors.push(error.message));
        page.on("response", response => {
            if (response.status() >= 400) errors.push(response.url());
        });
        for (const width of [1440, 390]) {
            await page.setViewportSize({ width, height: 960 });
            for (const name of ["index", "download", "usermanual", "commands"]) {
                await page.goto(`${base}/${name}.html`);
                await page.evaluate(async () => {
                    await document.fonts.ready;
                    await Promise.all(Array.from(document.images, image => {
                        image.loading = "eager";
                        return image.src ? image.decode() : Promise.resolve();
                    }));
                });
                assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: overflow at ${width}`);
                const links = await page.locator("a[href]").evaluateAll(links => links.map(link => link.getAttribute("href")));
                for (const href of links.filter(href => !/^(https?:|mailto:)/.test(href))) {
                    const url = new URL(href, `${base}/${name}.html`);
                    const file = path.join(root, "docs", decodeURIComponent(url.pathname));
                    assert(fs.existsSync(file), `Missing ${file}`);
                    if (url.hash && file.endsWith(".html")) assert(fs.readFileSync(file, "utf8").includes(`id="${url.hash.slice(1)}"`), `Missing ${href}`);
                }
                await page.screenshot({ path: `/tmp/dialogr-${name}-${width}.png` });
            }
        }
        await page.goto(`${base}/usermanual.html`);
        assert.equal(await page.locator("pre").count(), 0);
        for (const dialog of require("../../dialogs/dialogs.json")) assert.equal(await page.locator(`#${dialog.id}`).count(), 1);
        await page.locator("#manual-search").fill("declared");
        assert(await page.locator("#declared-values").isVisible());
        await page.locator("#manual-search").fill("zzznomatchingtopic");
        assert.equal(await page.locator("[data-chapter]:visible").count(), 0);
        await page.locator("#manual-search").fill("");
        const opener = page.locator("[data-enlarge]").first();
        await opener.click();
        assert(await page.locator("#screenshot-viewer").isVisible());
        await page.keyboard.press("Escape");
        await opener.click();
        await page.locator("#close-screenshot").click();
        assert(!(await page.locator("#screenshot-viewer").isVisible()));
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page.goto(`${base}/usermanual.html#declared-values`);
        await page.locator("#declared-values").evaluate(element => element.scrollIntoView({ behavior: "instant" }));
        await page.screenshot({ path: "/tmp/dialogr-declared-values.png" });
        for (const id of ["finding-variables", "commands"]) {
            await page.locator(`#${id}`).evaluate(element => element.scrollIntoView({ behavior: "instant" }));
            await page.screenshot({ path: `/tmp/dialogr-${id}.png` });
        }
        const noJS = await browser.newPage({ javaScriptEnabled: false });
        await noJS.goto(`${base}/usermanual.html#frequencies`);
        assert(await noJS.locator("#frequencies").isVisible());
        assert.equal(await noJS.locator("[data-enlarge]").first().getAttribute("href"), "images/manual/frequencies.png");
        assert.deepEqual(errors, []);
        console.log("Verified four pages at desktop/mobile widths, local links, images, all 12 dialogs, search, screenshot viewer, and manual without JavaScript.");
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
