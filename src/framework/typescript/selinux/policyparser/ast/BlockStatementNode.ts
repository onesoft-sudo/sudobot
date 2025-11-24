import Node from "./Node";
import type { Range } from "../PolicyModuleParserTypes";

class BlockStatementNode<T extends Node = Node> extends Node {
    public readonly children: T[];

    public constructor(children: T[], range: Range) {
        super(range);
        this.children = children;
    }

    public override branches() {
        return this.children;
    }
}

export default BlockStatementNode;
