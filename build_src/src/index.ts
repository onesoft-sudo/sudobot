import moduleAlias from "module-alias";
import "module-alias/register";
import path from "path";
import BlazeBuild from "./core/BlazeBuild";

moduleAlias.addAliases({
    "@blazebuild": path.resolve(__dirname, "..")
});

moduleAlias({
    base: path.resolve(__dirname, "..")
});

const cli = BlazeBuild.getInstance();

async function main() {
    await cli.setup();
    await cli.run();
}

export default main();
