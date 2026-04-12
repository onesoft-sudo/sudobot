import { normalize } from "@framework/utils/string";
import type { ProfileMessageRulePayload } from "@main/moderation/ProfileMessageRule";
import ProfileMessageRule from "@main/moderation/ProfileMessageRule";
import { RuleContext } from "@main/moderation/Rule";
import type { RuleDefinitionByType } from "@schemas/all";
import type { Awaitable } from "discord.js";

class WordRule extends ProfileMessageRule<"word_filter"> {
    public override readonly name = "word_filter";

    private checkTexts(
        texts: (string | null | undefined)[],
        definition: RuleDefinitionByType<"word_filter">
    ) {
        for (let text of texts) {
            if (!text) {
                continue;
            }

            if (definition.normalize) {
                text = normalize(text);
            }

            if (definition.tokens.some(token => text.includes(token))) {
                return false;
            }

            const words = new Set(text.split(/\s+/));

            for (const word of definition.words) {
                if (words.has(word)) {
                    return false;
                }
            }
        }

        return true;
    }

    public override check(
        { member, message }: ProfileMessageRulePayload,
        { definition }: RuleContext<"word_filter">
    ): Awaitable<boolean> {
        return this.checkTexts(
            [
                member?.presence?.status,
                member?.displayName,
                member?.nickname,
                message?.content,
                message?.embeds.reduce(
                    (s, e) =>
                        s +
                        " " +
                        (e.description ?? "") +
                        " " +
                        (e.author?.name ?? "") +
                        " " +
                        (e.title ?? "") +
                        " " +
                        (e.footer?.text ?? "") +
                        +" " +
                        (e.provider?.name ?? "") +
                        " " +
                        e.fields.reduce(
                            (s, f) => s + " " + f.name + " " + f.value + " ",
                            ""
                        ),
                    ""
                )
            ],
            definition
        );
    }
}

export default WordRule;
