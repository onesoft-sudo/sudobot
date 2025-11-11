import { ESLintUtils, type TSESTree } from "@typescript-eslint/utils";

const breakBeforeControlRule = ESLintUtils.RuleCreator.withoutDocs({
    create(context) {
        const source = context.sourceCode;

        function check(node: TSESTree.Node, keyword: string) {
            const keywordToken = source.getTokenBefore(node, { filter: token => token.value === keyword });

            if (!keywordToken) {
                return;
            }

            const prevKeywordToken = source.getTokenBefore(keywordToken);

            if (!prevKeywordToken) {
                return;
            }

            const prevBraceToken = source.getTokenBefore(prevKeywordToken);

            if (!prevBraceToken) {
                return;
            }

            const between = source.text.slice(prevKeywordToken.range[1], keywordToken.range[0]);
            const betweenBrace =
                source.text.slice(prevBraceToken.range[1], prevKeywordToken.range[0]).split("\n").at(-1) || "";

            if (!between.includes("\n")) {
                context.report({
                    node,
                    messageId: "expectedBreak",
                    data: {
                        token: keyword
                    },
                    fix(fixer) {
                        return fixer.replaceTextRange(
                            [prevKeywordToken.range[1], keywordToken.range[0]],
                            "\n" + betweenBrace
                        );
                    }
                });
            }
        }

        return {
            IfStatement(node) {
                if (node.alternate) {
                    check(node.alternate, "else");
                }
            },
            CatchClause(node) {
                check(node, "catch");
            },
            TryStatement(node) {
                check(node, "finally");
            }
        };
    },
    defaultOptions: [],
    meta: {
        type: "layout",
        docs: {
            description: "Require a blank line before else/catch/finally"
        },
        fixable: "whitespace",
        schema: [],
        messages: {
            expectedBreak: "Expected a line break before '{{token}}'."
        }
    }
});

export default breakBeforeControlRule;
