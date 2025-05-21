// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        extends: [eslint.configs.recommended, ...tseslint.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
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
        rules: {
            indent: "off",
            semi: ["warn", "always"],
            "no-var": "off",
            "linebreak-style": ["error", "unix"],
            quotes: [
                "warn",
                "double",
                {
                    avoidEscape: true
                }
            ],
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
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/restrict-template-expressions": "off"
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
