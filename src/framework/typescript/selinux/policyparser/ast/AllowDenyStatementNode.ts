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

import Node from "./Node";
import type { Range } from "../PolicyModuleParserTypes";

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

    public isWildcard(): this is this & { target: "*" } {
        return this.target === "*";
    }
}

export default AllowDenyStatementNode;
