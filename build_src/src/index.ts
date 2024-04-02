import BlazeBuild from "./core/BlazeBuild";

const cli = BlazeBuild.getInstance();

async function main() {
    await cli.setup();
    await cli.run();
}

export default main();
