import BlazeBuild from "./core/BlazeBuild";

declare global {
    // eslint-disable-next-line no-var
    var _cli: typeof cli;
}

const cli = BlazeBuild.getInstance();

global._cli = cli;

async function main() {
    await cli.setup();
    await cli.run();
}

export default main();
