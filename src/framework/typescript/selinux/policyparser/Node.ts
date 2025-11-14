import type { Range } from "./PolicyModuleParserTypes";

abstract class Node {
    public readonly range: Range;

    public constructor(range: Range) {
        this.range = range;
    }

    public abstract branches(): Node[];
}

export default Node;
