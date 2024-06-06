import { Awaitable } from "blazebuild";
import BlazePlugin from "blazebuild/src/main/typescript/plugins/BlazePlugin";
import CleanTask from "./tasks/CleanTask";
import CompileTask from "./tasks/CompileTask";
import CompileTypeScriptTask from "./tasks/CompileTypeScriptTask";
import DependenciesTask from "./tasks/DependenciesTask";
import LintTask from "./tasks/LintTask";
import ProcessCoverageReportsTask from "./tasks/ProcessCoverageReportsTask";
import RunTask from "./tasks/RunTask";
import TestTask from "./tasks/TestTask";

class BuildPlugin extends BlazePlugin {
    public override boot(): Awaitable<void> {
        this.blaze.taskManager.named("build", {
            dependsOn: ["compile", "lint", "test"],
            outputs: [this.blaze.projectManager.properties.structure?.buildOutputDirectory ?? ""]
        });
    }

    public override tasks() {
        return [
            CleanTask,
            CompileTask,
            CompileTypeScriptTask,
            DependenciesTask,
            LintTask,
            ProcessCoverageReportsTask,
            RunTask,
            TestTask
        ];
    }
}

export default BuildPlugin;
