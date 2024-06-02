import AbstractTask from "../../tasks/AbstractTask";
import { ActionlessTask } from "../../tasks/ActionlessTask";
import { Task } from "../../tasks/Task";

@ActionlessTask
@Task({
    description: "Builds the project",
    group: "Build"
})
class BuildTask extends AbstractTask {}

export default BuildTask;
