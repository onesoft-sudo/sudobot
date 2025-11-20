import type LiteralNode from "./LiteralNode";
import Node from "./Node";
import type { Range } from "./PolicyModuleParserTypes";

class ModuleBlockPropertyNode extends Node {
    public readonly identifier: string;
    public readonly value: LiteralNode;

    public constructor(identifier: string, value: LiteralNode, range: Range) {
        super(range);
        this.identifier = identifier;
        this.value = value;
    }

    public override branches(): Node[] {
        return [this.value];
    }
}

export default ModuleBlockPropertyNode;
