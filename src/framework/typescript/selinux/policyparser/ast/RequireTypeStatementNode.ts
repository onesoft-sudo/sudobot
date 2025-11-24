import type { Range } from "../PolicyModuleParserTypes";
import Node from "./Node";

class RequireTypeStatementNode extends Node {
    public readonly identifier: string;

    public constructor(identifier: string, range: Range) {
        super(range);
        this.identifier = identifier;
    }

    public override branches() {
        return [];
    }
}

export default RequireTypeStatementNode;
