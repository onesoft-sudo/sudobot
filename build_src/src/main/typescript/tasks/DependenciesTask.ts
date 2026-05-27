import {
    AbstractTask,
    Task,
    TaskAction,
    TaskOutputGenerator,
    isInPath,
    x
} from "@onesoftnet/blazebuild";

@Task({
    description: "Installs the dependencies",
    group: "Build"
})
class DependenciesTask extends AbstractTask {
    @TaskAction
    protected override async run(): Promise<void> {
        if (isInPath("pnpm")) {
            await x(`pnpm install --prefer-offline --no-color`);
            return;
        }

        await x(`bun install --trust`);
    }

    @TaskOutputGenerator
    protected override generateOutput(): string[] {
        return ["node_modules"];
    }
}

export default DependenciesTask;
