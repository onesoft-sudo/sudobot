import {
    AbstractTask,
    type Awaitable,
    FileResolvable,
    files,
    IO,
    Task,
    TaskAction,
    TaskInputGenerator,
    TaskOutputGenerator
} from "blazebuild";
import { $ } from "bun";

@Task({
    description: "Generates the database migrations",
    group: "Database"
})
class GenerateMigrationsTask extends AbstractTask {
    @TaskAction
    protected override async run(): Promise<void> {
        IO.newline();
        await $`npx drizzle-kit generate`;
    }

    @TaskInputGenerator
    protected override generateInput(): Awaitable<Iterable<FileResolvable>> {
        return files("src/main/typescript/models/**/*.ts");
    }

    @TaskOutputGenerator
    protected override generateOutput(): Awaitable<Iterable<FileResolvable>> {
        return ["drizzle"];
    }
}

export default GenerateMigrationsTask;
