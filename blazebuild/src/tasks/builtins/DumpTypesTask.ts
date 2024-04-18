import { existsSync } from "fs";
import { cp } from "fs/promises";
import path from "path";
import AbstractTask from "../../core/AbstractTask";
import BlazeBuild from "../../core/BlazeBuild";
import { Caching, CachingMode } from "../../decorators/Caching";
import { Awaitable } from "../../types/Awaitable";

@Caching(CachingMode.None)
class DumpTypesTask extends AbstractTask {
    public override readonly name = "dumpTypes";
    public override readonly defaultDescription: string =
        "Dumps the build types for the build scripts";
    public override readonly defaultGroup: string = "Core";

    public override precondition(): Awaitable<boolean> {
        return !existsSync(BlazeBuild.buildInfoDir("build.d.ts"));
    }

    public override async execute(): Promise<void> {
        await cp(
            path.resolve(__dirname, "../../templates/build.d.ts"),
            BlazeBuild.buildInfoDir("build.d.ts")
        );
    }
}

export default DumpTypesTask;
