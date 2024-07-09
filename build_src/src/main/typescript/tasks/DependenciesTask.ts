import { AbstractTask, IO, Task, TaskAction, TaskOutputGenerator } from "blazebuild";
import { $ } from "bun";

@Task({
    description: "Installs the dependencies",
    group: "Build"
})
class DependenciesTask extends AbstractTask {
    @TaskAction
    protected override async run(): Promise<void> {
        IO.newline();
        await $`bun install --trust`;
    }

    @TaskOutputGenerator
    protected override generateOutput(): string[] {
        return ["node_modules"];
    }
}

export default DependenciesTask;
