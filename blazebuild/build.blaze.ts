import { tasks } from "blazebuild";
import { writeFile } from "fs/promises";
import { glob } from "glob";

tasks
    .define("typeCheck")
    .description("Type-check the project")
    .inputFiles(await glob("src/**/*.ts"))
    .handler(async () => {
        await writeFile("compilation.log", "Hello, BlazeBuild!");
    });

tasks
    .define("build")
    .description("Build the project")
    .inputFiles(await glob("src/**/*.ts"))
    .dependsOn("typeCheck");
