import BlazeBuild from "./core/BlazeBuild";

const cli = BlazeBuild.getInstance();

await cli.setup();
await cli.run();
