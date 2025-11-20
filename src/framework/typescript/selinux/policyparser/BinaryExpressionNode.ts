import Node from "./Node";
import type { Range } from "./PolicyModuleParserTypes";

class BinaryExpressionNode extends Node {
    public readonly left: Node;
    public readonly right: Node;
    public readonly operator: string;

    public constructor(left: Node, right: Node, operator: string, range: Range) {
        super(range);
        this.left = left;
        this.right = right;
        this.operator = operator;
    }

    public override branches() {
        return [this.left, this.right];
    }
}

export default BinaryExpressionNode;
