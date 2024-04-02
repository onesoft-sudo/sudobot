module.exports = {
    env: {
        browser: true,
        es2021: true
    },
    extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: true,
        tsconfigRootDir: __dirname
    },
    plugins: ["@typescript-eslint"],
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
        "@typescript-eslint/no-unused-vars": [
            "warn",
            {
                argsIgnorePattern: "^_",
                varsIgnorePattern: "^_",
                caughtErrorsIgnorePattern: "^_"
            }
        ],
        "@typescript-eslint/no-misused-promises": [
            "warn",
            {
                checksVoidReturn: false
            }
        ]
    },
    overrides: [
        {
            files: ["*.d.ts"],
            rules: {
                "@typescript-eslint/no-unused-vars": "off"
            }
        },
        {
            files: ["*.d.ts", "*.ts"],
            rules: {
                "@typescript-eslint/explicit-member-accessibility": [
                    "error",
                    { accessibility: "explicit" }
                ]
            }
        }
    ],
    ignorePatterns: [
        "*.js",
        "./node_modules/**",
        "./extensions/**",
        "./docs/**",
        "./*.bak/**",
        "./tests/**",
        "*.blaze.ts"
    ]
};
