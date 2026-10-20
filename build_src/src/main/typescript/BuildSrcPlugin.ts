import { AbstractPlugin } from "@onesoftnet/blazebuild";
import CompileTask from "./tasks/CompileTask.js";
import CompileTypeScriptTask from "./tasks/CompileTypeScriptTask.js";
import CopyResourcesTask from "./tasks/CopyResourcesTask.js";

class BuildSrcPlugin extends AbstractPlugin {
    public override tasks() {
        return [CompileTask, CompileTypeScriptTask, CopyResourcesTask];
    }

    public override async setup() {
        (await this.build.taskManager.findByName("build")).addDependency("copyResources");
    }
}

export default BuildSrcPlugin;
