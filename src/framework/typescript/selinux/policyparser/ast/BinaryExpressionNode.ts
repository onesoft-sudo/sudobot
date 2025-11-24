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
