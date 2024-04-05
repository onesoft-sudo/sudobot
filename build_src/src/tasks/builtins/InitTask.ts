import { setTimeout } from "timers/promises";
import AbstractTask from "../../core/AbstractTask";
import { Caching, CachingMode } from "../../decorators/Caching";
import { Task } from "../../decorators/Task";

@Caching(CachingMode.None)
class InitTask extends AbstractTask {
    public override readonly name = "init2";

    public override async execute(): Promise<void> {
        await setTimeout(5000);
    }

    @Task({ name: "test2", noPrefix: true })
    public test() {}
}

export default InitTask;
