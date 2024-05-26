import "blazebuild/types/build.d";

import AbstractTask from "blazebuild/tasks/AbstractTask";
import { TaskAction } from "blazebuild/tasks/TaskAction";
import { TaskDependencyGenerator } from "blazebuild/tasks/TaskDependencyGenerator";
import { TaskInputGenerator } from "blazebuild/tasks/TaskInputGenerator";
import { TaskOutputGenerator } from "blazebuild/tasks/TaskOutputGenerator";
import { setOf } from "blazebuild/utils/collection";
import { $ } from "bun";
import { rm } from "fs/promises";

class CleanTask extends AbstractTask {
    @TaskOutputGenerator
    protected override generateOutput() {
        return setOf("tmp/test-report.txt", "tmp/output.txt");
    }

    @TaskAction
    protected override async run() {
        await rm("tmp/test-report.txt", { force: true });
        await rm("tmp/output.txt", { force: true });
    }
}
class TestTask extends AbstractTask {
    @TaskOutputGenerator
    protected override generateOutput() {
        return setOf("tmp/test-report.txt");
    }

    @TaskAction
    protected override async run() {
        console.log("Testing project...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        Bun.write("tmp/test-report.txt", "report");
    }
}

class BuildTask extends AbstractTask {
    @TaskInputGenerator
    protected override generateInput() {
        return setOf("tmp/input.txt");
    }

    @TaskOutputGenerator
    protected override generateOutput() {
        return setOf("tmp/output.txt");
    }

    @TaskDependencyGenerator
    protected override dependencies() {
        return setOf(TestTask);
    }

    @TaskAction
    protected override async run() {
        console.log("Running task!");
        await new Promise(resolve => setTimeout(resolve, 2000));
        const inputFile = Bun.file("tmp/input.txt");
        const content = (await inputFile.exists())
            ? "Copied: " + (await inputFile.text())
            : "Default content";
        Bun.write("tmp/output.txt", content);
        await $`echo "Build successful!"`;
    }
}

tasks.register(CleanTask);
tasks.register(TestTask);
tasks.register(BuildTask);
