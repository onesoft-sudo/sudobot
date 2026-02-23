/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025 OSN Developers.
 *
 * SudoBot is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SudoBot is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
 */

import { readFile } from "fs/promises";
import PolicyModuleParser from "./policyparser/PolicyModuleParser";
import { PolicyModuleSchema, type PolicyModuleType } from "./PolicyModuleSchema";
import ModuleBlockStatementNode from "./policyparser/ast/ModuleBlockStatementNode";
import PoilcyModuleCompilationError from "./PoilcyModuleCompilationError";
import type LiteralNode from "./policyparser/ast/LiteralNode";
import { LiteralKind } from "./policyparser/ast/LiteralNode";
import type RootNode from "./policyparser/ast/RootNode";
import RequireBlockStatementNode from "./policyparser/ast/RequireBlockStatementNode";
import RequireTypeStatementNode from "./policyparser/ast/RequireTypeStatementNode";
import AllowDenyStatementNode from "./policyparser/ast/AllowDenyStatementNode";
import { PermissionFlagsBits } from "discord.js";
import type Node from "./policyparser/ast/Node";
import MessagePackEncoder from "./MessagePackEncoder";

class PolicyCompiler {
    private readonly policyModuleParser = new PolicyModuleParser();
    private readonly encoder = new MessagePackEncoder();
    private source: string = "";
    private filename: string = "";

    public encode(module: PolicyModuleType) {
        return this.encoder.encode(module);
    }

    public decode(data: ArrayLike<number> | ArrayBufferView | ArrayBufferLike): PolicyModuleType {
        return PolicyModuleSchema.parse(this.encoder.decode(data));
    }

    public compile(source: string | Buffer<ArrayBufferLike>, filename = "<input>"): PolicyModuleType {
        this.source = typeof source === "string" ? source : source.toString("utf-8");
        this.filename = filename;

        const parsedRootNode = this.policyModuleParser.parse(this.source);
        const module: PolicyModuleType = {
            policy_module: {
                name: "",
                version: 0
            },
            allow_types: [],
            allow_types_on_targets: {},
            deny_types_on_targets: {},
            deny_types: [],
            map_types: []
        };

        this.compileRootNode(parsedRootNode, module);
        return module;
    }

    public async compileFromFile(filepath: string): Promise<PolicyModuleType> {
        const contents = await readFile(filepath, "utf-8");
        return this.compile(contents, filepath);
    }

    protected compileRootNode(node: RootNode, module: PolicyModuleType) {
        for (const child of node.children) {
            if (child instanceof ModuleBlockStatementNode) {
                this.compileModuleNode(child, module);
                continue;
            }

            if (child instanceof RequireBlockStatementNode) {
                this.compileRequireNode(child, module);
                continue;
            }

            if (child instanceof AllowDenyStatementNode) {
                this.compileRuleNode(child, module);
                continue;
            }

            this.unsupported();
        }
    }

    protected error(node: Node | null, message: string): never {
        throw new PoilcyModuleCompilationError(message, this.filename, this.source, node);
    }

    protected compileRuleNode(node: AllowDenyStatementNode, module: PolicyModuleType) {
        const subjectIndex = this.getTypeIndexOrFail(node, node.subject, module);

        if (node.isWildcard()) {
            const targetRecord = node.type === "allow" ? module.allow_types : module.deny_types;
            targetRecord[subjectIndex] = this.resolvePermissionsOrFail(node, node.permissions);
        }
        else {
            const targetRecord = node.type === "allow" ? module.allow_types_on_targets : module.deny_types_on_targets;
            const targetIndex = this.getTypeIndexOrFail(node, node.target, module);
            targetRecord[subjectIndex] ??= {};
            targetRecord[subjectIndex][targetIndex] = this.resolvePermissionsOrFail(node, node.permissions);
        }
    }

    protected resolvePermissionsOrFail(node: Node, permissions: string[]) {
        let bitfield = 0n;

        for (const permission of permissions) {
            if (permission in PermissionFlagsBits) {
                bitfield |= PermissionFlagsBits[permission as keyof typeof PermissionFlagsBits];
                continue;
            }

            this.error(node, `Invalid permission type '${permission}'`);
        }

        return bitfield;
    }

    protected getTypeIndexOrFail(node: Node, typeString: string, module: PolicyModuleType) {
        const index = module.map_types.indexOf(typeString);

        if (index === -1) {
            this.error(node, `Invalid type '${typeString}': Did you forget to require it?`);
        }

        return index;
    }

    protected compileRequireNode(node: RequireBlockStatementNode, module: PolicyModuleType) {
        const types = new Set<string>();

        for (const child of node.block.children) {
            if (child instanceof RequireTypeStatementNode) {
                types.add(child.identifier);
                continue;
            }

            this.unsupported();
        }

        module.map_types = Array.from(types);
    }

    protected compileModuleNode(node: ModuleBlockStatementNode, module: PolicyModuleType) {
        const values = node.block.children.reduce(
            (acc, decl) => acc.set(decl.identifier, decl.value),
            new Map<string, LiteralNode>()
        );
        const name = values.get("name");
        const author = values.get("author");
        const version = values.get("version");

        if (name && name.kind !== LiteralKind.String) {
            this.error(node, "module.name must be a valid string");
        }

        if (author && author.kind !== LiteralKind.String) {
            this.error(node, "module.author must be a valid string");
        }

        if (version && version.kind !== LiteralKind.Integer) {
            this.error(node, "module.version must be a valid integer");
        }

        module.policy_module.name = name?.value ?? module.policy_module.name;
        module.policy_module.author = author?.value ?? module.policy_module.author;
        module.policy_module.version = version ? +version.value : module.policy_module.version;
    }

    protected unsupported(): never {
        this.error(null, "Unsupported node type: This indicates a compiler bug");
    }
}

export default PolicyCompiler;
