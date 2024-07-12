import chalk from "chalk";
import BlazeWrapper from "./BlazeWrapper";

async function main() {
    try {
        const wrapper = new BlazeWrapper();
        await wrapper.boot();
        await wrapper.run();
    } catch (error) {
        console.error(
            `${chalk.bold.red("error:")} ${chalk.white(error instanceof Error ? error.message : `${error}`)}`
        );
        process.exit(1);
    }
}

await main();
