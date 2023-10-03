require("module-alias/register");
const chalk = require("chalk");
const { spawnSync } = require("child_process");
const { existsSync, lstatSync, readdirSync, readFileSync, writeFileSync, rmSync } = require("fs");
const path = require("path");
const { chdir, cwd } = require("process");

const extensionsPath = path.resolve(__dirname, "../extensions");

function error(...args) {
    console.error(...args);
    process.exit(-1);
}

if (!existsSync(extensionsPath)) {
    error("You're not using any extension! To get started, create an `extensions` folder in the project root.");
}

function getRecuriveJavaScriptFiles(dir) {
    const files = readdirSync(dir);
    const flat = [];

    for (const fileName of files) {
        const file = path.join(dir, fileName);
        const isDirectory = lstatSync(file).isDirectory();

        if (isDirectory) {
            flat.push(...getRecuriveJavaScriptFiles(file));
            continue;
        }

        if (!file.endsWith(".js")) {
            continue;
        }

        flat.push(file);
    }

    return flat;
}

function readMeta(extensionName, extensionDirectory) {
    const metadataFile = path.join(extensionDirectory, "extension.json");

    if (!existsSync(metadataFile)) {
        error(`Extension ${extensionName} does not have a "extension.json" file!`);
    }

    const metadata = JSON.parse(readFileSync(metadataFile, { encoding: "utf-8" }));
    return metadata;
}

async function writeCacheIndex() {
    const extensionsOutputArray = [];
    const meta = [];
    const extensions = readdirSync(extensionsPath);

    for await (const extensionName of extensions) {
        const extensionDirectory = path.resolve(extensionsPath, extensionName);
        const isDirectory = lstatSync(extensionDirectory).isDirectory();

        if (!isDirectory) {
            continue;
        }

        console.log("Found extension: ", extensionName);

        // const metadataFile = path.join(extensionDirectory, "extension.json");

        // if (!existsSync(metadataFile)) {
        //     error(`Extension ${extensionName} does not have a "extension.json" file!`);
        // }

        // const metadata = JSON.parse(readFileSync(metadataFile, { encoding: "utf-8" }));
        // const {
        //     main_directory = "./build",
        //     commands = `./${main_directory}/commands`,
        //     events = `./${main_directory}/events`,
        //     main = `./${main_directory}/index.js`,
        //     language = "typescript"
        // } = metadata;

        const {
            main_directory = "./build",
            commands = `./${main_directory}/commands`,
            events = `./${main_directory}/events`,
            main = `./${main_directory}/index.js`,
            language = "typescript"
        } = readMeta(extensionName, extensionDirectory);

        const extensionPath = path.join(extensionDirectory, main);

        const imported = await require(extensionPath);
        const { default: ExtensionClass } = imported.__esModule ? imported : { default: imported };
        const extension = new ExtensionClass(this.client);
        let commandPaths = await extension.commands();
        let eventPaths = await extension.events();

        if (commandPaths === null) {
            const directory = path.join(__dirname, "../extensions", extensionName, commands);

            if (existsSync(directory)) {
                commandPaths = getRecuriveJavaScriptFiles(directory);
            }
        }

        if (eventPaths === null) {
            const directory = path.join(__dirname, "../extensions", extensionName, events);

            if (existsSync(directory)) {
                eventPaths = getRecuriveJavaScriptFiles(directory);
            }
        }

        extensionsOutputArray.push({
            name: extensionName,
            entry: extensionPath,
            commands: commandPaths ?? [],
            events: eventPaths ?? []
        });

        meta.push({
            language
        });
    }

    console.log("Overview of the extensions: ");
    console.table(
        extensionsOutputArray.map((e, i) => ({
            name: e.name,
            entry: e.entry.replace(path.resolve(__dirname, "../extensions"), "{ROOT}"),
            commands: e.commands.length,
            events: e.events.length,
            language: meta[i].language
        }))
    );

    const indexFile = path.join(__dirname, "../extensions/index.json");

    writeFileSync(
        indexFile,
        JSON.stringify(
            {
                extensions: extensionsOutputArray
            },
            null,
            4
        )
    );

    console.log("Wrote cache index file: ", indexFile);
    console.warn(
        "Note: If you're getting import errors after caching extensions, please try first by removing or rebuilding them."
    );
}

const MAX_CHARS = 7;

function actionLog(action, description) {
    console.log(
        chalk.green.bold(`${action}${action.length >= MAX_CHARS ? "" : " ".repeat(MAX_CHARS - action.length)} `),
        description
    );
}

function spawnSyncCatchExit(...args) {
    actionLog("RUN", args[0]);
    const { status } = spawnSync(...args);
    if (status !== 0) process.exit(status);
}

async function buildExtensions() {
    const startTime = Date.now();
    const extensions = readdirSync(extensionsPath);
    const workingDirectory = cwd();

    for await (const extensionName of extensions) {
        const extensionDirectory = path.resolve(extensionsPath, extensionName);
        const isDirectory = lstatSync(extensionDirectory).isDirectory();

        if (!isDirectory) {
            continue;
        }

        chdir(path.join(extensionsPath, extensionName));

        actionLog("DEPS", extensionName);
        spawnSyncCatchExit("npm install -D", {
            encoding: "utf-8",
            shell: true,
            stdio: "inherit"
        });

        actionLog("RELINK", extensionName);
        spawnSyncCatchExit(`npm link --save ${path.relative(cwd(), path.resolve(__dirname, ".."))}`, {
            encoding: "utf-8",
            shell: true,
            stdio: "inherit"
        });

        actionLog("BUILD", extensionName);
        const { build_command } = readMeta(extensionName, extensionDirectory);

        if (!build_command) {
            console.log(chalk.cyan.bold("INFO "), "This extension doesn't require building.");
            continue;
        }

        spawnSyncCatchExit(build_command, {
            encoding: "utf-8",
            shell: true,
            stdio: "inherit"
        });
    }

    actionLog("SUCCESS", `in ${((Date.now() - startTime) / 1000).toFixed(2)}s, built ${extensions.length} extensions`);
    chdir(workingDirectory);
}

if (process.argv.includes("--clear-cache") || process.argv.includes("--clean") || process.argv.includes("--delcache")) {
    const indexFile = path.join(__dirname, "../extensions/index.json");

    if (!existsSync(indexFile)) {
        error("No cached index file found!");
    }

    rmSync(indexFile);
    console.log("Removed cached index file: ", indexFile);
} else if (process.argv.includes("--cache") || process.argv.includes("--index")) {
    console.time("Finished in");
    console.log("Creating cache index for all the installed extensions");
    writeCacheIndex()
        .then(() => console.timeEnd("Finished in"))
        .catch(e => {
            console.log(e);
            console.timeEnd("Finished in");
        });
} else if (process.argv.includes("--build")) {
    console.log("Building installed extensions");
    buildExtensions().catch(e => {
        console.log(e);
        process.exit(-1);
    });
} else {
    console.log("Usage:");
    console.log("  node extensions.js <options>\n");
    console.log("Options:");
    console.log("  --build  |  Builds all the installed extensions, if needed.");
    console.log("  --cache  |  Creates cache indexes for installed extensions, to improve the startup time.");
    console.log("  --clean  |  Clears all installed extension cache.");
    process.exit(-1);
}
