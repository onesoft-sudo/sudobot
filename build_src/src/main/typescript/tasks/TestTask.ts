import {
    AbstractTask,
    Task,
    TaskAction,
    TaskDependencyGenerator,
    TaskInputGenerator,
    files,
    x,
    type Awaitable
} from "@onesoftnet/blazebuild";
import { spawnSync, $ } from "bun";
import { existsSync } from "node:fs";

@Task({
    description: "Runs the tests",
    group: "Testing"
})
class TestTask extends AbstractTask {
    @TaskInputGenerator
    protected override generateInput(): Awaitable<string[]> {
        return files(`${process.cwd()}/tests/**/*.ts`);
    }

    @TaskAction
    protected override async run(): Promise<void> {
        try {
            await $`which node`;
            console.log(process.env.PATH);
        }
        catch (error) {
            console.error(error);
        }

        const projectLocalNodePath = '.blazebuild/node/bin/node' + (process.platform === 'win32' ? '.exe' : '');
        const nodePath = existsSync(projectLocalNodePath) ? projectLocalNodePath : process.argv[0];
        console.log(nodePath);

        const {exitCode} = spawnSync(["node_modules/.bin/vitest", "--run"], {
            stdio: ['inherit', 'inherit', 'inherit'],
            env: process.env
        });

        if (exitCode) {
            throw new Error(`vitest exited with code ${exitCode}`);
        }
    }

    @TaskDependencyGenerator
    protected override dependencies() {
        return ["dependencies"];
    }
}

export default TestTask;
