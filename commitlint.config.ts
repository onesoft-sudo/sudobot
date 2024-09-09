import { RuleConfigSeverity, type UserConfig } from "@commitlint/types";

const config: UserConfig = {
    extends: ["@commitlint/config-conventional"],
    parserPreset: "conventional-changelog-angular",
    rules: {
        "type-enum": [
            RuleConfigSeverity.Error,
            "always",
            [
                "feat",
                "fix",
                "docs",
                "style",
                "refactor",
                "perf",
                "test",
                "chore",
                "revert",
                "build",
                "ci",
                "release",
                "deps",
                "security",
                "i18n",
                "merge"
            ]
        ],
        "signed-off-by": [RuleConfigSeverity.Error, "always", "Signed-off-by: "],
        "body-max-length": [RuleConfigSeverity.Error, "always", 1024]
    },
    prompt: {
        settings: {},
        messages: {
            skip: ":skip",
            max: "upper %d chars",
            min: "%d chars at least",
            emptyWarning: "can not be empty",
            upperLimitWarning: "over limit",
            lowerLimitWarning: "below limit"
        },
        questions: {
            type: {
                description: "Select the type of change that you're committing:",
                enum: {
                    feat: {
                        title: "Features",
                        description: "A new feature",
                        emoji: "✨"
                    },
                    fix: {
                        title: "Bug Fixes",
                        description: "A bug fix",
                        emoji: "🐛"
                    },
                    docs: {
                        title: "Documentation",
                        description: "Documentation only changes",
                        emoji: "📚"
                    },
                    style: {
                        title: "Styles",
                        description:
                            "Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)",
                        emoji: "💎"
                    },
                    refactor: {
                        title: "Code Refactoring",
                        description: "A code change that neither fixes a bug nor adds a feature",
                        emoji: "📦"
                    },
                    perf: {
                        title: "Performance Improvements",
                        description: "A code change that improves performance",
                        emoji: "🚀"
                    },
                    test: {
                        title: "Tests",
                        description: "Adding missing tests or correcting existing tests",
                        emoji: "🚨"
                    },
                    build: {
                        title: "Builds",
                        description:
                            "Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)",
                        emoji: "🛠"
                    },
                    ci: {
                        title: "Continuous Integrations",
                        description:
                            "Changes to our CI configuration files and scripts (example scopes: Travis, Circle, BrowserStack, SauceLabs)",
                        emoji: "⚙️"
                    },
                    chore: {
                        title: "Chores",
                        description: "Other changes that don't modify src or test files",
                        emoji: "♻️"
                    },
                    revert: {
                        title: "Reverts",
                        description: "Reverts a previous commit",
                        emoji: "🗑"
                    },
                    release: {
                        title: "Release",
                        description: "Create a release commit",
                        emoji: "🔖"
                    },
                    deps: {
                        title: "Dependencies",
                        description: "Update dependencies",
                        emoji: "📦"
                    },
                    security: {
                        title: "Security",
                        description: "Fix a security issue",
                        emoji: "🔒"
                    },
                    i18n: {
                        title: "Internationalization",
                        description: "Internationalization or localization changes",
                        emoji: "🌐"
                    }
                }
            },
            scope: {
                description: "What is the scope of this change (e.g. component or file name)"
            },
            subject: {
                description: "Write a short, imperative tense description of the change"
            },
            body: {
                description: "Provide a longer description of the change"
            },
            isBreaking: {
                description: "Are there any breaking changes?"
            },
            breakingBody: {
                description:
                    "A BREAKING CHANGE commit requires a body. Please enter a longer description of the commit itself"
            },
            breaking: {
                description: "Describe the breaking changes"
            },
            isIssueAffected: {
                description: "Does this change affect any open issues?"
            },
            issuesBody: {
                description:
                    "If issues are closed, the commit requires a body. Please enter a longer description of the commit itself"
            },
            issues: {
                description: 'Add issue references (e.g. "fix #123", "re #123".)'
            }
        }
    }
};

export default config;
