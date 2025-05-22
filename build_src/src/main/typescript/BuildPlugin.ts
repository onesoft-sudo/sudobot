import { Awaitable, BlazePlugin } from "blazebuild";
import CleanTask from "./tasks/CleanTask";
import CompileTask from "./tasks/CompileTask";
import CompileTypeScriptTask from "./tasks/CompileTypeScriptTask";
import CopyResourcesTask from "./tasks/CopyResourcesTask";
import DependenciesTask from "./tasks/DependenciesTask";
import LintTask from "./tasks/LintTask";
import MigrateTask from "./tasks/MigrateTask";
import ProcessCoverageReportsTask from "./tasks/ProcessCoverageReportsTask";
import RunTask from "./tasks/RunTask";
import TestTask from "./tasks/TestTask";

class BuildPlugin extends BlazePlugin {
    public override boot(): Awaitable<void> {
        this.blaze.taskManager.modifyOrCreateTask("build", task => {
            task.setDescription("Build the project");
            task.addDependencies("compile", "copyResources", "lint", "test");
            task.addOutput(
                this.blaze.projectManager.properties.structure
                    ?.buildOutputDirectory ?? ""
            );
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
            CopyResourcesTask,
            MigrateTask
        ];
    }
}

export default BuildPlugin;
