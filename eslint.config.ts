import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";
import LocalPlugin from "./src/eslint/typescript/LocalPlugin";

export default defineConfig([
    {
        extends: [
            eslint.configs.recommended,
            ...tseslint.configs.recommended,
            ...tseslint.configs.recommendedTypeChecked,
        ],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            parserOptions: {
                project: true,
                tsconfigRootDir: import.meta.dirname,
                ecmaVersion: "latest",
                sourceType: "module"
            }
        },
        plugins: {
            '@stylistic': stylistic,
            '@local': LocalPlugin
        },
        rules: {
            indent: "off",
            semi: ["warn", "always"],
            quotes: [
                "warn",
                "double",
                {
                    avoidEscape: true
                }
            ],
            "no-var": "off",
            "linebreak-style": ["error", "unix"],
            "padding-line-between-statements": [
                "error",
                {
                    blankLine: "always",
                    prev: "block-like",
                    next: "*"
                }
            ],
            "@typescript-eslint/no-var-requires": "off",
            "@typescript-eslint/consistent-type-imports": ["error", { disallowTypeAnnotations: false }],
            "@typescript-eslint/no-misused-promises": [
                "warn",
                {
                    checksVoidReturn: false
                }
            ],
            "@typescript-eslint/explicit-member-accessibility": ["error", { accessibility: "explicit" }],
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/restrict-template-expressions": "off",
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_"
                }
            ],
            "@local/break-before-control": "error",
        },
        files: ["src/**/*.ts"],
        ignores: [
            "**/*.js",
            "**/node_modules",
            "**/extensions",
            "**/docs",
            "**/*.bak",
            "**/tests",
            "*.blaze.ts",
            "build",
            "**/imports.gen.ts"
        ]
    }
]);
