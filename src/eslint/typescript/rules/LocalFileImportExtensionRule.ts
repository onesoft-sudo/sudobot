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

import { ESLintUtils } from "@typescript-eslint/utils";

const localFileImportExtensionRule = ESLintUtils.RuleCreator.withoutDocs({
    create(context) {
        return {
            ImportDeclaration(node) {
                const options = (
                    context.options as unknown as [{ importAliases?: string[] }]
                )[0];

                const importSource = node.source.value;

                if (
                    !importSource.startsWith("./") &&
                    !importSource.startsWith("../") &&
                    (!options?.importAliases ||
                        options?.importAliases?.every(
                            alias => !importSource.startsWith(alias)
                        ))
                ) {
                    return;
                }

                if (importSource.indexOf(".") === -1) {
                    context.report({
                        messageId: "missingFileExtension",
                        node: node.source,
                        data: {
                            file: importSource
                        },
                        fix: fixer => {
                            return [
                                fixer.replaceText(
                                    node.source,
                                    `"${importSource.replaceAll("\\", "\\\\")}.js"`
                                )
                            ];
                        }
                    });
                }
            }
        };
    },
    defaultOptions: [],
    meta: {
        type: "problem",
        docs: {
            description:
                "Require an explicit extension for local module file imports"
        },
        fixable: "whitespace",
        schema: [
            {
                type: "object",
                required: false,
                properties: {
                    importAliases: {
                        type: "array",
                        items: {
                            type: "string"
                        },
                        required: false
                    }
                }
            }
        ],
        messages: {
            missingFileExtension:
                "Missing explicit extension for the imported module '{{file}}'."
        }
    }
});

export default localFileImportExtensionRule;
