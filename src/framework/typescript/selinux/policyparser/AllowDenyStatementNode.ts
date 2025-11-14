import Node from "./Node";
import type { Range } from "./PolicyModuleParserTypes";

class AllowDenyStatementNode extends Node {
    public readonly type: "allow" | "deny";
    public readonly subject: string;
    public readonly target: string;
    public readonly permissions: string[];

    public constructor(type: "allow" | "deny", subject: string, target: string, permissions: string[], range: Range) {
        super(range);
        this.type = type;
        this.subject = subject;
        this.target = target;
        this.permissions = permissions;
    }

    public override branches() {
        return [];
    }
}

export default AllowDenyStatementNode;
