import chalk from "chalk";
import { spawn } from "child_process";
import { existsSync } from "fs";
import { Plugin } from "../core/Plugin";
import IO from "../io/IO";

export class TypeScriptPlugin extends Plugin {
    public async compile() {
        const { metadata } = this.cli.projectManager;

        IO.println(
            `${chalk.green("COMPILE")} ${chalk.gray(`${metadata.srcDir}/**/*.ts`)} -> ${chalk.gray(
                `${metadata.buildDir}/**/*.js`
            )}`
        );

        const tscPath = existsSync("node_modules/.bin/tsc") ? "node_modules/.bin/tsc" : "tsc";

        spawn(tscPath, ["-p", metadata.tsconfigPath ?? "./tsconfig.json"], {
            stdio: "inherit",
            shell: true
        }).once("close", code => {
            if (code !== 0) {
                IO.fail("TypeScript compilation failed");
            }
        });
    }
}

export const plugin = new TypeScriptPlugin();
export const typescript = plugin;
