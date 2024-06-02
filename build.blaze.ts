import "blazebuild/types/build.d";

import CleanTask from "@buildSrc/tasks/CleanTask";
import CompileTask from "@buildSrc/tasks/CompileTask";
import CompileTypeScriptTask from "@buildSrc/tasks/CompileTypeScriptTask";
import DependenciesTask from "@buildSrc/tasks/DependenciesTask";
import LintTask from "@buildSrc/tasks/LintTask";
import ProcessCoverageReportsTask from "@buildSrc/tasks/ProcessCoverageReportsTask";
import RunTask from "@buildSrc/tasks/RunTask";
import TestTask from "@buildSrc/tasks/TestTask";

tasks.register(DependenciesTask);
tasks.register(CleanTask);
tasks.register(CompileTypeScriptTask);
tasks.register(CompileTask);
tasks.register(TestTask);
tasks.register(LintTask);
tasks.register(ProcessCoverageReportsTask);
tasks.register(RunTask);

tasks.named("build", {
    dependsOn: ["compile", "lint", "test"],
    outputs: ["build"]
});
