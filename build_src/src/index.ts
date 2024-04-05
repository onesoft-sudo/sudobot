import "reflect-metadata";
import BlazeBuild from "./core/BlazeBuild";

declare global {
    // eslint-disable-next-line no-var
    var _cli: typeof cli;
}

const cli = BlazeBuild.getInstance();

global._cli = cli;

async function main() {
    await cli.setup();
    // const tasks = cli.taskManager;

    // tasks.register(InitTask, {
    //     doFirst() {
    //         IO.println("Hello, world!");
    //     },
    //     doLast() {
    //         IO.println("Goodbye, world!");
    //     }
    // });

    // await cli.taskManager.execute("init");
    await cli.run();
}

export default main();
