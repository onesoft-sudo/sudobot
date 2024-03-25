import chalk from "chalk";
import { spawn } from "child_process";
import { existsSync } from "fs";
import { Plugin } from "../core/Plugin";
import IO from "../io/IO";

export class TypeScriptPlugin extends Plugin {
    public compile() {
        const { metadata } = this.cli.projectManager;

        IO.println(
            `${chalk.green("COMPILE")} ${chalk.gray(`${metadata.srcDir}/**/*.ts`)} -> ${chalk.gray(
                `${metadata.buildDir}/**/*.js`
            )}`
        );

        const tscPath = existsSync("node_modules/.bin/tsc") ? "node_modules/.bin/tsc" : "tsc";

        const process = spawn(tscPath, ["-p", metadata.tsconfigPath ?? "./tsconfig.json"], {
            stdio: "pipe",
            shell: true
        });

        process.stdout.on("data", data => {
            IO.println(data.toString());
        });

        process.stderr.on("data", data => {
            IO.println(data.toString());
        });

        return new Promise<void>(resolve => {
            process.once("close", code => {
                if (code !== 0) {
                    IO.fail("TypeScript compilation failed");
                }

                resolve();
            });
        });
    }
}

export const plugin = new TypeScriptPlugin();
export const typescript = plugin;
