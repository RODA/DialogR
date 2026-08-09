#!/usr/bin/env node
"use strict";

const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
const { spawnSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const keychainProfile = String(
    process.env.DIALOGR_NOTARY_PROFILE || process.env.DIALOGFORGE_NOTARY_PROFILE || "developer-id-notary"
).trim();

const fail = function(message) {
    throw new Error(message);
};

const readObject = function(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : {};
};

const requireMacOS = function() {
    if (process.platform !== "darwin") {
        fail("macOS notarization commands must run on macOS.");
    }
};

const resolveDialogForgeRoot = function() {
    const candidates = [
        process.env.DIALOGFORGE_ROOT || "",
        path.join(projectRoot, "DialogForge"),
        path.join(projectRoot, "../DialogForge")
    ].filter(Boolean);
    const dialogForgeRoot = candidates.find((candidate) => {
        return fs.existsSync(path.join(candidate, "package.json"))
            && fs.existsSync(path.join(candidate, "node_modules", "app-builder-bin"));
    });

    if (!dialogForgeRoot) {
        fail(
            "Could not find DialogForge with installed packaging dependencies. " +
            "Set DIALOGFORGE_ROOT or install the sibling DialogForge checkout."
        );
    }

    return dialogForgeRoot;
};

const productDetails = function() {
    const packagePath = path.join(projectRoot, "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    const product = readObject(packageJson.product);
    const productName = String(
        product.name || product.displayName || packageJson.productName || packageJson.name || "DialogR"
    ).trim();
    const outputDir = path.join(projectRoot, "build", "output");
    const productFileName = productName.replace(/\s+/g, "_");

    return {
        appPath: path.join(outputDir, "mac-arm64", `${productName}.app`),
        dmgPath: path.join(outputDir, `${productFileName}_silicon.dmg`),
        latestMacPath: path.join(outputDir, "latest-mac.yml"),
        outputDir
    };
};

const requirePath = function(targetPath, label) {
    if (!fs.existsSync(targetPath)) {
        fail(`Missing ${label}: ${targetPath}`);
    }

    return targetPath;
};

const runCommand = function(command, args) {
    const result = spawnSync(command, args, {
        cwd: projectRoot,
        stdio: "inherit"
    });

    if (result.error) {
        throw result.error;
    }

    if (result.status !== 0) {
        fail(`${command} failed with exit code ${String(result.status)}.`);
    }
};

const runXcrun = function(args) {
    runCommand("xcrun", args);
};

const fileHash = function(filePath, algorithm, encoding) {
    return crypto.createHash(algorithm)
        .update(fs.readFileSync(filePath))
        .digest(encoding);
};

const updaterZipDetails = function(latestMacPath, outputDir, yaml) {
    requirePath(latestMacPath, "macOS updater metadata");
    const latest = yaml.load(fs.readFileSync(latestMacPath, "utf8")) || {};
    const files = Array.isArray(latest.files) ? latest.files : [];
    const zipEntry = files.find((entry) => {
        return /\.zip$/i.test(String((entry || {}).url || ""));
    });

    if (!zipEntry) {
        fail(`No updater ZIP is listed in ${latestMacPath}.`);
    }

    return {
        latest,
        zipEntry,
        zipPath: path.join(outputDir, String(zipEntry.url))
    };
};

const rebuildUpdaterZip = function(appPath, latestMacPath, outputDir) {
    const dialogForgeRoot = resolveDialogForgeRoot();
    const yaml = require(path.join(dialogForgeRoot, "node_modules", "js-yaml"));
    const { appBuilderPath } = require(
        path.join(dialogForgeRoot, "node_modules", "app-builder-bin")
    );
    const update = updaterZipDetails(latestMacPath, outputDir, yaml);
    const temporaryZipPath = `${update.zipPath}.stapled`;
    const blockMapPath = `${update.zipPath}.blockmap`;
    const temporaryBlockMapPath = `${blockMapPath}.stapled`;

    fs.rmSync(temporaryZipPath, { force: true });
    fs.rmSync(temporaryBlockMapPath, { force: true });

    console.log(`Rebuilding updater ZIP from ${appPath}`);
    runCommand("ditto", [
        "-c",
        "-k",
        "--sequesterRsrc",
        "--keepParent",
        appPath,
        temporaryZipPath
    ]);
    runCommand(appBuilderPath, [
        "blockmap",
        "--input",
        temporaryZipPath,
        "--output",
        temporaryBlockMapPath
    ]);

    fs.renameSync(temporaryZipPath, update.zipPath);
    fs.renameSync(temporaryBlockMapPath, blockMapPath);

    const sha512 = fileHash(update.zipPath, "sha512", "base64");
    update.zipEntry.size = fs.statSync(update.zipPath).size;
    update.zipEntry.sha512 = sha512;
    update.latest.files = [update.zipEntry];
    update.latest.path = String(update.zipEntry.url);
    update.latest.sha512 = sha512;

    fs.writeFileSync(latestMacPath, yaml.dump(update.latest, {
        lineWidth: -1,
        noRefs: true
    }));
};

const writeArtifactChecksums = function(outputDir) {
    const artifacts = fs.readdirSync(outputDir, { withFileTypes: true })
        .filter((entry) => {
            const extension = path.extname(entry.name).toLowerCase();
            return entry.isFile() && (extension === ".dmg" || extension === ".zip");
        })
        .map((entry) => entry.name)
        .sort((left, right) => left.localeCompare(right));
    const sha256Lines = [];
    const sha512Lines = [];

    artifacts.forEach((fileName) => {
        const artifactPath = path.join(outputDir, fileName);
        sha256Lines.push(`${fileHash(artifactPath, "sha256", "hex")}  ${fileName}`);
        sha512Lines.push(`${fileHash(artifactPath, "sha512", "hex")}  ${fileName}`);
    });

    fs.writeFileSync(
        path.join(outputDir, "SHA256SUMS.txt"),
        `${sha256Lines.join("\n")}\n`
    );
    fs.writeFileSync(
        path.join(outputDir, "SHA512SUMS.txt"),
        `${sha512Lines.join("\n")}\n`
    );
    console.log(`Wrote checksums for ${String(artifacts.length)} artifact(s).`);
};

const readHistory = function() {
    const result = spawnSync("xcrun", [
        "notarytool",
        "history",
        "--keychain-profile",
        keychainProfile,
        "--output-format",
        "json"
    ], {
        cwd: projectRoot,
        encoding: "utf8"
    });

    if (result.error) {
        throw result.error;
    }

    if (result.status !== 0) {
        process.stderr.write(String(result.stderr || ""));
        fail(`notarytool history failed with exit code ${String(result.status)}.`);
    }

    const parsed = JSON.parse(String(result.stdout || "{}"));

    return Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.history)
            ? parsed.history
            : [];
};

const latestHistoryEntries = function(history) {
    return history.slice().sort((left, right) => {
        const leftTime = Date.parse(String(left.createdDate || ""));
        const rightTime = Date.parse(String(right.createdDate || ""));
        const normalizedLeft = Number.isFinite(leftTime) ? leftTime : 0;
        const normalizedRight = Number.isFinite(rightTime) ? rightTime : 0;

        return normalizedRight - normalizedLeft;
    }).slice(0, 2);
};

const assertAppIsReadyForNotarization = function() {
    const { appPath } = productDetails();
    requirePath(appPath, "built application");
    const result = spawnSync("codesign", ["-dv", "--verbose=4", appPath], {
        cwd: projectRoot,
        encoding: "utf8"
    });

    if (result.error) {
        throw result.error;
    }

    const output = `${String(result.stdout || "")}${String(result.stderr || "")}`;

    if (result.status !== 0) {
        process.stderr.write(output);
        fail(`codesign inspection failed for ${appPath}.`);
    }

    const hasDeveloperId = output.includes("Authority=Developer ID Application:");
    const hasTimestamp = output.includes("Timestamp=");
    const hasHardenedRuntime = output.includes("flags=0x10000(runtime)")
        || output.includes("Runtime Version=");

    if (!hasDeveloperId || !hasTimestamp || !hasHardenedRuntime) {
        const reasons = [];

        if (!hasDeveloperId) {
            reasons.push("missing Developer ID signature");
        }
        if (!hasTimestamp) {
            reasons.push("missing secure timestamp");
        }
        if (!hasHardenedRuntime) {
            reasons.push("missing hardened runtime");
        }

        fail(
            `App bundle is not ready for notarization (${reasons.join(", ")}). ` +
            "Build with npm run build -- --sign."
        );
    }
};

const submit = function() {
    assertAppIsReadyForNotarization();
    const { dmgPath } = productDetails();
    requirePath(dmgPath, "built DMG");

    console.log(`Submitting ${dmgPath}`);
    runXcrun([
        "notarytool",
        "submit",
        dmgPath,
        "--keychain-profile",
        keychainProfile
    ]);
};

const showLatestHistory = function() {
    const latest = latestHistoryEntries(readHistory());

    if (latest.length === 0) {
        throw new Error("No notarization submissions were returned.");
    }

    latest.forEach((entry, index) => {
        if (index > 0) {
            console.log("");
        }
        console.log(`Submission ${String(index + 1)}:`);
        console.log(`Name: ${String(entry.name || "(unknown)")}`);
        console.log(`Status: ${String(entry.status || "(unknown)")}`);
        console.log(`Created: ${String(entry.createdDate || "(unknown)")}`);
        console.log(`ID: ${String(entry.id || "(unknown)")}`);
    });
};

const staple = function() {
    const {
        appPath,
        dmgPath,
        latestMacPath,
        outputDir
    } = productDetails();
    requirePath(appPath, "built application");
    requirePath(dmgPath, "built DMG");

    console.log(`Stapling ${appPath}`);
    runXcrun([
        "stapler",
        "staple",
        appPath
    ]);
    runXcrun([
        "stapler",
        "validate",
        appPath
    ]);
    runCommand("codesign", [
        "--verify",
        "--deep",
        "--strict",
        "--verbose=2",
        appPath
    ]);

    rebuildUpdaterZip(appPath, latestMacPath, outputDir);

    console.log(`Stapling ${dmgPath}`);
    runXcrun([
        "stapler",
        "staple",
        dmgPath
    ]);
    runXcrun([
        "stapler",
        "validate",
        dmgPath
    ]);

    writeArtifactChecksums(outputDir);
};

const main = function() {
    requireMacOS();
    const action = String(process.argv[2] || "").trim();

    if (action === "submit") {
        submit();
        return;
    }

    if (action === "history") {
        showLatestHistory();
        return;
    }

    if (action === "staple") {
        staple();
        return;
    }

    fail("Unknown notarization action. Expected submit, history, or staple.");
};

main();
