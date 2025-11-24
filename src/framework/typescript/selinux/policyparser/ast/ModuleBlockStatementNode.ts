import type BlockStatementNode from "./BlockStatementNode";
import Node from "./Node";
import type { Range } from "../PolicyModuleParserTypes";
import type ModuleBlockPropertyNode from "./ModuleBlockPropertyNode";

class ModuleBlockStatementNode extends Node {
    public readonly block: BlockStatementNode<ModuleBlockPropertyNode>;

    public constructor(block: BlockStatementNode<ModuleBlockPropertyNode>, range: Range) {
        super(range);
        this.block = block;
    }

    public override branches() {
        return [this.block];
    }
}

export default ModuleBlockStatementNode;
