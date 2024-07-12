import chalk from "chalk";
import { spawn } from "child_process";
import { existsSync } from "fs";
import { mkdir, symlink } from "fs/promises";
import path from "path";
import { parseArgs } from "util";
import BlazeInvoker from "./BlazeInvoker";
import IO from "./IO";
import Properties from "./Properties";
import SDKManager from "./SDKManager";
import { BUN_INTERPRETER, file, NODE_DIR, TMPDIR } from "./utils";

class BlazeWrapper {
    public readonly positionalArgs: ReadonlyArray<string>;
    public readonly options: ReturnType<
        typeof parseArgs<{ options: ReturnType<BlazeWrapper["optionDefinitions"]> }>
    >["values"];
    public readonly argv0: string;
    private _properties = new Properties();
    public readonly sdkManager = new SDKManager(this);

    public constructor() {
        try {
            const { positionals, values } = parseArgs({
                args: process.argv,
                allowPositionals: true,
                strict: true,
                options: this.optionDefinitions()
            });

            if (positionals[0] === process.argv0) {
                positionals.shift();
                positionals.shift();
            }

            this.positionalArgs = positionals;
            this.options = values;
            this.argv0 = values.progname ?? "blazew";
        } catch (error) {
            IO.fatal(error instanceof Error ? error.message : `${error}`);
        }
    }

    public get properties() {
        return this._properties;
    }

    public async boot() {
        if (this.options.debug && this.options.quiet) {
            IO.fatal("Cannot have both debug and quiet flags enabled");
        }

        if (this.options.quiet) {
            IO.setNoOutput(true);
        }

        if (this.options.debug) {
            process.env.BLAZE_DEBUG = "1";
            process.env.BLAZEW_DEBUG = "1";
        }

        this._properties = await Properties.fromFile(
            file("blaze/wrapper/blaze_wrapper.properties")
        );

        if (!existsSync(TMPDIR)) {
            await mkdir(TMPDIR);
        }

        if (existsSync(file("node_modules/.bin"))) {
            this.addDirToPath(file("node_modules/.bin"));
        }

        if (existsSync(path.join(NODE_DIR, "bin"))) {
            this.addDirToPath(path.resolve(NODE_DIR, "bin"));
        }
    }

    private addDirToPath(dir: string) {
        process.env.PATH = `${dir}${process.platform === "win32" ? ";" : ":"}${process.env.PATH}`;
    }

    private optionDefinitions() {
        return {
            help: {
                short: "h",
                type: "boolean" as const
            },
            version: {
                short: "v",
                type: "boolean" as const
            },
            progname: {
                type: "string" as const
            },
            quiet: {
                short: "q",
                type: "boolean" as const
            },
            debug: {
                type: "boolean" as const
            }
        } satisfies NonNullable<NonNullable<Parameters<typeof parseArgs>[0]>["options"]>;
    }

    private getVersion() {
        return this._properties.get("blaze.version", "1.0.0-alpha.1");
    }

    public async run() {
        if (this.options.help) {
            this.showHelp();
        } else if (this.options.version) {
            this.showVersion();
        } else {
            await this.sdkManager.install();
            await this.installDeps();
            await this.createLink();
            await this.invokeBlaze();
        }
    }

    private async installDeps() {
        const blazebuildDir = this._properties.get("blaze.srcpath", "blazebuild");
        const blazebuildPath = file(blazebuildDir);

        if (existsSync(path.join(blazebuildPath, "node_modules"))) {
            return;
        }

        IO.info("Installing BlazeBuild dependencies...");

        const child = spawn(BUN_INTERPRETER, ["install"], {
            stdio: this.options.quiet ? "ignore" : "inherit",
            env: process.env,
            cwd: blazebuildPath,
            detached: false
        });

        if (child.exitCode !== null && child.exitCode !== 0) {
            process.exit(child.exitCode);
        }

        if (child.exitCode === null) {
            const code = await new Promise<number>(resolve => {
                child.on("exit", code => {
                    resolve(code ?? 1);
                });
            });

            if (code !== 0) {
                process.exit(code);
            }
        }
    }

    private async createLink() {
        const blazebuildDir = this._properties.get("blaze.srcpath", "blazebuild");
        const blazebuildPath = file(blazebuildDir);

        if (existsSync(file("node_modules/blazebuild"))) {
            return;
        }

        if (!existsSync(file("node_modules"))) {
            await mkdir(file("node_modules"), {
                recursive: true
            });
        }

        IO.info("Linking BlazeBuild...");
        await symlink(blazebuildPath, path.join(process.cwd(), "node_modules/blazebuild"));
    }
    private invokeBlaze() {
        const invoker = new BlazeInvoker(this);
        return invoker.invoke();
    }

    private printLogo() {
        console.log(
            chalk.white.bold(
                `      
                \a____  _               ____        _ _     _ 
                | __ )| | __ _ _______| __ ) _   _(_) | __| |
                |  _ \\| |/ _\` |_  / _ \\  _ \\| | | | | |/ _\` |
                | |_) | | (_| |/ /  __/ |_) | |_| | | | (_| |
                |____/|_|\\__,_/___\\___|____/ \\__,_|_|_|\\__,_|                                                

            `
                    .replace(/^\s+/g, "")
                    .replace(/\n\s*/g, "\n")
                    .replace(/\a/g, " ")
            )
        );
    }

    private showHelp() {
        this.printLogo();
        console.log(chalk.bold.blue(`BlazeBuild Wrapper version ${this.getVersion()}`));
        console.log();
        console.log(chalk.white.bold("Usage:"));
        console.log("  blazew [options] [command] [args...] [-- [fargs...]]");
        console.log();
        console.log(chalk.white.bold("Options:"));
        console.log("  --help,    -h    Show this help message and exit.");
        console.log("  --version, -v    Show the version number and exit.");
        console.log("  --quiet,   -q    Disable output.");
        console.log("  --debug          Enable debug mode.");
        this.exit();
    }

    private showVersion() {
        console.log("BlazeBuild wrapper v0.1.0");
        this.exit();
    }

    public exit(code = 0): never {
        process.exit(code);
    }
}

export default BlazeWrapper;
