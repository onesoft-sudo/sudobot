import {
    AbstractTask,
    Task,
    TaskAction,
    TaskOutputGenerator,
    isInPath
} from "blazebuild";
import { $ } from "bun";

@Task({
    description: "Installs the dependencies",
    group: "Build"
})
class DependenciesTask extends AbstractTask {
    @TaskAction
    protected override async run(): Promise<void> {
        if (isInPath("pnpm")) {
            await $`pnpm install --prefer-offline --no-color`;
            return;
        }

        await $`bun install --trust`;
    }

    @TaskOutputGenerator
    protected override generateOutput(): string[] {
        return ["node_modules"];
    }
}

export default DependenciesTask;
