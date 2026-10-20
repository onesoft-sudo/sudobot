import { CreateTask } from "../../tasks/CreateTask.js";
import { TaskStatus } from "../../tasks/TaskStatus.js";

class BuildTask extends CreateTask {
    public override readonly description = "Build the project";

    public override dependencies() {
        return [];
    }

    public override async execute() {
        return TaskStatus.Success;
    }
}

export default BuildTask;
