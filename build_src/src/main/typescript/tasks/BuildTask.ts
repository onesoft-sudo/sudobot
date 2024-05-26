import AbstractTask from "blazebuild/tasks/AbstractTask";
import { TaskAction } from "blazebuild/tasks/TaskAction";
import { TaskDependencyGenerator } from "blazebuild/tasks/TaskDependencyGenerator";
import CompileTask from "./CompileTask";
import LintTask from "./LintTask";
import TestTask from "./TestTask";

class BuildTask extends AbstractTask {
    @TaskAction
    protected override async run(): Promise<void> {}

    @TaskDependencyGenerator
    protected override async dependencies() {
        return [CompileTask, LintTask, TestTask];
    }
}

export default BuildTask;
