import { spawnSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import path from "path";

const colors = {
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    bold: "\x1b[1m",
    reset: "\x1b[0m"
};

function getVersion() {
    return getProperty("blaze.version", "1.0.0-alpha.1");
}

function usage() {
    console.log("Usage: %s [file] --- [args...]", process.argv0);
    process.exit(1);
}

function startup() {
    console.log(
        `${colors.bold}${colors.blue}BlazeBuild Wrapper version ${getVersion()}${colors.reset}\n`
    );
}

function help() {
    startup();

    console.log(`${colors.bold}Usage:${colors.reset}\n  %s [file] --- [args...]\n`, process.argv0);

    console.log(`${colors.bold}Options:${colors.reset}`);
    console.log("  --help, -h       Show this help message and exit.");
    console.log("  --version, -v    Show the version number and exit.");
    console.log("  --quiet, -q      Disable output.");
    console.log("  --debug          Enable debug mode.");

    process.exit(0);
}

function version() {
    console.log(getVersion());
    process.exit(0);
}

const PROPERTIES_PATH = path.resolve(__dirname, "blaze_wrapper.properties");
const PROJECT_DIR = path.resolve(__dirname, "..", "..");
let properties = {};

function readProperties() {
    if (!existsSync(PROPERTIES_PATH)) {
        return;
    }

    const contents = readFileSync(PROPERTIES_PATH, {
        encoding: "utf8"
    });

    properties = contents.split("\n").reduce((acc, line) => {
        const [key, value] = line.split("=");
        acc[key.trim()] = value.trim();
        return acc;
    }, {});
}

/**
 * Get a property from the blaze configuration.
 *
 * @param {string} name The name of the property.
 * @returns {string} The value of the property.
 */
function getProperty(name, def) {
    return properties[name] ?? def;
}

function determineIndexFile() {
    const blazeSrcPath = getProperty("blaze.srcpath", "build_src");
    return path.resolve(PROJECT_DIR, blazeSrcPath, "src/index.ts");
}

function getBunPath() {
    if (process.isBun) {
        return process.argv[0];
    }

    throw new Error("Node.js is not supported. Please use Bun.");
}

/**
 * Execute a file with the given arguments.
 *
 * @param {string} file
 * @param {...string} args
 */
function execute(file, ...args) {
    const { status } = spawnSync(getBunPath(), [file, ...args], {
        stdio: process.env.BLAZE_QUIET === "1" ? "ignore" : "inherit"
    });

    if (status !== 0) {
        process.exit(status);
    }
}

function initialize() {
    readProperties();
}

function main() {
    const OPTIONS = ["--help", "-h", "--version", "-v", "--quiet", "-q", "--debug"];

    if (process.argv.length < 3) {
        usage();
    }

    const index = process.argv.indexOf("---");

    if (index === -1) {
        usage();
    }

    initialize();

    const args = process.argv.slice(index + 1).filter(arg => !OPTIONS.includes(arg));
    const file =
        process.argv.at(index - 1) === __filename
            ? determineIndexFile()
            : process.argv.at(index - 1);

    if (process.argv.includes("--help") || process.argv.includes("-h")) {
        help();
    } else if (process.argv.includes("--version") || process.argv.includes("-v")) {
        version();
    } else if (process.argv.includes("--quiet") || process.argv.includes("-q")) {
        process.env.BLAZE_QUIET = "1";
    } else if (process.argv.includes("--debug")) {
        process.env.DEBUG = "1";
    }

    execute(file, ...args);
}

main();
