import type BlockStatementNode from "./BlockStatementNode";
import Node from "./Node";
import type { Range } from "../PolicyModuleParserTypes";
import type RequireTypeStatementNode from "./RequireTypeStatementNode";

class RequireBlockStatementNode extends Node {
    public readonly block: BlockStatementNode<RequireTypeStatementNode>;

    public constructor(block: BlockStatementNode<RequireTypeStatementNode>, range: Range) {
        super(range);
        this.block = block;
    }

    public override branches() {
        return [this.block];
    }
}

export default RequireBlockStatementNode;
