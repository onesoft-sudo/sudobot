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

import type Node from "./policyparser/ast/Node";

class PoilcyModuleCompilationError extends Error {
    public readonly node: Node | null;
    public readonly source: string | null;
    public readonly filename: string | null;
    public readonly sourceLines: string[];

    public constructor(message: string, filename: string, source: string | null, node: Node | null) {
        super(message);
        this.filename = filename;
        this.source = source;
        this.node = node;
        this.sourceLines = source ? source.split("\n") : [];
    }

    public formatASCII() {
        let str = "";

        str += `${this.filename}:`;

        if (this.node) {
            str += `${this.node.range.start[1]}:${this.node.range.start[2]}:`;
        }

        str += ` error: ${this.message}\n\n`;

        if (this.node) {
            const range = this.node.range;

            for (let line = range.start[1]; line <= range.end[1]; line++) {
                str += `${line.toString().padEnd(4)} | ${this.sourceLines[line - 1]}\n`;
            }

            const markerRange = range.start[1] !== range.end[1] ? [1, range.end[2]] : [range.start[2], range.end[2]];
            str += "      " + " ".repeat(markerRange[0]);

            for (let i = markerRange[0] - 1; i < markerRange[1]; i++) {
                str += "^";
            }

            str += "\n";
        }

        return str;
    }
}

export default PoilcyModuleCompilationError;
