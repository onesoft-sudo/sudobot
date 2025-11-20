import Node from "./Node";
import { Range } from "./PolicyModuleParserTypes";

class BlockStatementNode extends Node {
    public readonly children: Node[];

    public constructor(children: Node[], range: Range) {
        super(range);
        this.children = children;
    }

    public override branches() {
        return this.children;
    }
}

export default BlockStatementNode;
