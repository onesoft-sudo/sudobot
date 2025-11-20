import Node from "./Node";
import type { Range } from "./PolicyModuleParserTypes";

export enum LiteralKind {
    String,
    Integer,
    Boolean
}

class LiteralNode extends Node {
    public readonly kind: LiteralKind;
    public readonly value: string;

    public constructor(kind: LiteralKind, value: string, range: Range) {
        super(range);
        this.kind = kind;
        this.value = value;
    }

    public override branches(): Node[] {
        return [];
    }
}

export default LiteralNode;
