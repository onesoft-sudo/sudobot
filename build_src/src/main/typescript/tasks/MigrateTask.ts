import { AbstractTask, IO, Task, TaskAction, TaskDependencyGenerator } from "blazebuild";
import { $ } from "bun";

@Task({
    description: "Runs the database migrations",
    group: "Database"
})
class MigrateTask extends AbstractTask {
    @TaskDependencyGenerator
    protected override dependencies() {
        return ["generateMigrations"];
    }

    @TaskAction
    protected override async run(): Promise<void> {
        IO.newline();
        await $`npx drizzle-kit migrate`;
    }
}

export default MigrateTask;
