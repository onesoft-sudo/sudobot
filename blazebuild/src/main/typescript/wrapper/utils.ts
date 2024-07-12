import { existsSync } from "fs";
import path from "path";

export function file(filePath: string): string {
    return path.resolve(process.cwd(), filePath);
}

export const TMPDIR = file(".blaze");
export const NODE_DIR = path.join(TMPDIR, "node");
export const NODE_INTERPRETER = path.join(NODE_DIR, "bin", "node");
export const BUN_DIR = path.join(TMPDIR, "bun");
export const BUN_INTERPRETER = (() => {
    const bunPath = path.join(BUN_DIR, "bin", "bun");

    if (existsSync(bunPath)) {
        return bunPath;
    }

    return "bun";
})();
