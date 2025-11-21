import type BlockStatementNode from "./BlockStatementNode";
import Node from "./Node";
import type { Range } from "../PolicyModuleParserTypes";

class ModuleBlockStatementNode extends Node {
    public readonly block: BlockStatementNode;

    public constructor(block: BlockStatementNode, range: Range) {
        super(range);
        this.block = block;
    }

    public override branches() {
        return [this.block];
    }
}

export default ModuleBlockStatementNode;
