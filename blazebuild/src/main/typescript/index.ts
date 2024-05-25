import "reflect-metadata";

import Blaze from "./core/Blaze";
import AbstractTask from "./tasks/AbstractTask";
import { TaskAction } from "./tasks/TaskAction";
import { TaskOutputGenerator } from "./tasks/TaskOutputGenerator";
import { setOf } from "./types/collection";

class BuildTask extends AbstractTask {
    @TaskOutputGenerator
    protected override generateOutput() {
        return setOf("tmp/input.txt");
    }

    @TaskAction
    protected override async run() {
        console.log("Running task!");
        await Bun.write("tmp/input.txt", "Hello, World!");
    }
}

async function main() {
    const blaze = Blaze.getInstance();
    await blaze.boot();
    blaze.taskManager.register(BuildTask);
    await blaze.run();
    await blaze.cacheManager.saveCache();
}

await main();
