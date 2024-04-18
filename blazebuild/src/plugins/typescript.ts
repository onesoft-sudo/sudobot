import { spawn } from "child_process";
import { existsSync } from "fs";
import { SystemPlugin } from "../core/SystemPlugin";
import IO from "../io/IO";

export class TypeScriptPlugin extends SystemPlugin {
    public compile() {
        const { metadata } = this.cli.projectManager;

        // IO.println(
        //     `${chalk.green("COMPILE")} ${chalk.gray(`${metadata.srcDir}/**/*.ts`)} -> ${chalk.gray(
        //         `${metadata.buildDir}/**/*.js`
        //     )}`.padEnd(process.stdout.columns ?? 80, " ")
        // );

        const tscPath = existsSync("node_modules/.bin/tsc") ? "node_modules/.bin/tsc" : "tsc";

        const proc = spawn(tscPath, ["-p", metadata.tsconfigPath ?? "./tsconfig.json"], {
            stdio: "pipe",
            shell: true
        });

        proc.stdout.on("data", data => {
            IO.println(data.toString());
        });

        proc.stderr.on("data", data => {
            IO.println(data.toString());
        });

        return new Promise<void>(resolve => {
            proc.once("close", code => {
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
