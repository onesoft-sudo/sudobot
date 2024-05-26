import AbstractTask from "blazebuild/tasks/AbstractTask";
import { TaskAction } from "blazebuild/tasks/TaskAction";
import { TaskInputGenerator } from "blazebuild/tasks/TaskInputGenerator";
import { $ } from "bun";

class DependenciesTask extends AbstractTask {
    @TaskAction
    protected override async run(): Promise<void> {
        await $`bun install`;
        await $`test -e $(pwd)/node_modules/blazebuild && rm -r $(pwd)/node_modules/blazebuild || true`;
        await $`ln -s $(pwd)/blazebuild/src/main/typescript $(pwd)/node_modules/blazebuild`;
    }

    @TaskInputGenerator
    protected override generateInput(): string[] {
        return ["node_modules"];
    }
}

export default DependenciesTask;
