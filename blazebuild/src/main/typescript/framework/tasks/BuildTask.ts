import AbstractTask from "../../tasks/AbstractTask";
import { ActionlessTask } from "../../tasks/ActionlessTask";

@ActionlessTask
class BuildTask extends AbstractTask {}

export default BuildTask;
