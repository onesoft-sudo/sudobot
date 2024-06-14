import { Awaitable, BlazePlugin } from "blazebuild";
import CleanTask from "./tasks/CleanTask";
import CompileTask from "./tasks/CompileTask";
import CompileTypeScriptTask from "./tasks/CompileTypeScriptTask";
import CopyResourcesTask from "./tasks/CopyResourcesTask";
import DependenciesTask from "./tasks/DependenciesTask";
import LintTask from "./tasks/LintTask";
import ProcessCoverageReportsTask from "./tasks/ProcessCoverageReportsTask";
import RunTask from "./tasks/RunTask";
import TestTask from "./tasks/TestTask";

class BuildPlugin extends BlazePlugin {
    public override boot(): Awaitable<void> {
        this.blaze.taskManager.named("build", {
            dependsOn: ["compile", "copyResources", "lint", "test"],
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
            TestTask,
            CopyResourcesTask
        ];
    }
}

export default BuildPlugin;
