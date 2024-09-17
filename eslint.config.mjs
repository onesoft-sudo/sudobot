// @ts-check

import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        extends: [eslint.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.node,
                ...globals.es2021
            },
            parserOptions: {
                project: true,
                tsconfigRootDir: import.meta.dirname,
                ecmaVersion: "latest",
                sourceType: "module"
            }
        },
        rules: {
            indent: "off",
            "linebreak-style": ["error", "unix"],
            quotes: [
                "warn",
                "double",
                {
                    avoidEscape: true
                }
            ],
            semi: ["warn", "always"],
            "@typescript-eslint/no-var-requires": "off",
            "@typescript-eslint/consistent-type-imports": [
                "error",
                { disallowTypeAnnotations: false }
            ],
            "@typescript-eslint/no-misused-promises": [
                "warn",
                {
                    checksVoidReturn: false
                }
            ],
            "@typescript-eslint/explicit-member-accessibility": [
                "error",
                { accessibility: "explicit" }
            ],
            "@typescript-eslint/no-unused-vars": "off"
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
            "build"
        ]
    },
    {
        rules: {
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_"
                }
            ]
        },
        files: ["src/**/*.ts"],
        ignores: ["**/*.d.ts"]
    }
);
