import { CreateTask, TaskStatus } from "@onesoftnet/blazebuild";

class CompileTask extends CreateTask {
    public override readonly description = "Compile the source files";

    public override dependencies() {
        return ["compileTypeScript"];
    }

    public override async execute() {
        return TaskStatus.Success;
    }
}

export default CompileTask;
