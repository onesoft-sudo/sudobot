import chalk from "chalk";
import { spawn } from "child_process";
import { existsSync } from "fs";
import { mkdir, symlink } from "fs/promises";
import path from "path";
import BlazeInvoker from "./BlazeInvoker";
import IO from "./IO";
import Properties from "./Properties";
import SDKManager from "./SDKManager";
import { BUN_INTERPRETER, file, NODE_DIR, TMPDIR } from "./utils";

class BlazeWrapper {
    public readonly argv0: string = "blazew";
    private _properties = new Properties();
    public readonly sdkManager = new SDKManager(this);

    public get properties() {
        return this._properties;
    }

    public async boot() {
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

    private getVersion() {
        return this._properties.get("blaze.version", "1.0.0-alpha.1");
    }

    public async run() {
        await this.sdkManager.install();
        await this.installDeps();
        await this.createLink();

        if (existsSync(file("node_modules/.bin"))) {
            this.addDirToPath(file("node_modules/.bin"));
        }

        if (existsSync(path.join(NODE_DIR, "bin"))) {
            this.addDirToPath(path.resolve(NODE_DIR, "bin"));
        }

        await this.invokeBlaze();
    }

    private async installDeps() {
        const blazebuildDir = this._properties.get("blaze.srcpath", "blazebuild");
        const blazebuildPath = file(blazebuildDir);

        if (existsSync(path.join(blazebuildPath, "node_modules"))) {
            return;
        }

        IO.info("Installing BlazeBuild dependencies...");

        const child = spawn(BUN_INTERPRETER, ["install"], {
            stdio: "inherit",
            env: process.env,
            cwd: blazebuildPath,
            detached: false
        });

        const code = await new Promise<number>(resolve => {
            child.on("exit", code => {
                resolve(code ?? 1);
            });
        });

        if (code !== 0) {
            process.exit(code);
        }
    }

    private async createLink() {
        const blazebuildDir = this._properties.get("blaze.srcpath", "blazebuild");
        const blazebuildPath = file(blazebuildDir);

        if (!existsSync(blazebuildPath)) {
            IO.fatal(`BlazeBuild not found at ${blazebuildPath}`);
        }

        if (existsSync(file("node_modules/blazebuild"))) {
            return;
        }

        if (!existsSync(file("node_modules"))) {
            await mkdir(file("node_modules"), {
                recursive: true
            });
        }

        IO.info("Linking BlazeBuild...");
        const linkPath = file("node_modules/blazebuild");
        await symlink(blazebuildPath, linkPath, "dir");
        IO.debug(`Linked BlazeBuild to ${blazebuildPath}`);
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
