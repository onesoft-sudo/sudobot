import * as esbuild from "esbuild";
import path from "path";

await esbuild.build({
    entryPoints: [path.resolve(__dirname, "../src/main/typescript/wrapper/init.ts")],
    bundle: true,
    minify: true,
    platform: "node",
    tsconfig: path.resolve(__dirname, "../tsconfig.json"),
    outfile: path.resolve(__dirname, "../build/wrapper.js"),
    format: "esm",
    sourcemap: true
});
