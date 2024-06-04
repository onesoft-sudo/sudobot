import { type Buildable, Command } from "@framework/commands/Command";
import { TakesArgument } from "@framework/arguments/ArgumentTypes";
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import type Context from "@framework/commands/Context";
import { ContextType } from "@framework/commands/ContextType";
import ClassLoader from "@framework/import/ClassLoader";
import FatalError from "@main/core/FatalError";
import { GatewayEventListener } from "@framework/events/GatewayEventListener";
import {
    type ApplicationCommandOptionChoiceData,
    EmbedBuilder,
    type Interaction,
    User
} from "discord.js";
import TranslationService from "@main/services/TranslationService";
import { Inject } from "@framework/container/Inject";
import RestStringArgument from "@framework/arguments/RestStringArgument";

type TranslateCommandArgs = {
    text: string;
};

@TakesArgument<TranslateCommandArgs>({
    names: ["text"],
    types: [RestStringArgument],
    optional: false,
    errorMessages: [
        {
            [ErrorType.Required]: "You must provide text to translate."
        }
    ]
})
class TranslateCommand extends Command<ContextType, true> {
    public override readonly name: string = "translate";
    public override readonly description: string = "Translate text to another language.";
    public override readonly defer = true;
    public override readonly aliases = ["Translate to English"];
    public override readonly usage = ["<text: String>"];
    public override readonly supportedContexts = [
        ContextType.ChatInput,
        ContextType.Legacy,
        ContextType.MessageContextMenu
    ];
    protected readonly displayNames = new Intl.DisplayNames(["en"], {
        type: "language"
    });
    protected readonly supportedLocales = Intl.DisplayNames.supportedLocalesOf();
    private languages: Record<string, string> = {};

    @Inject()
    private readonly translationService!: TranslationService;

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .addStringOption(option =>
                    option
                        .setName("text")
                        .setDescription("The text to translate.")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("to")
                        .setDescription("The language to translate to.")
                        .setAutocomplete(true)
                )
                .addStringOption(option =>
                    option
                        .setName("from")
                        .setDescription("The language to translate from.")
                        .setAutocomplete(true)
                )
        ];
    }

    public override async initialize(): Promise<void> {
        using file = await ClassLoader.getInstance(this.application).getResource("languages.json");

        if (!file) {
            throw new FatalError("Failed to load languages.json.");
        }

        this.languages = await file.readJson();
    }

    @GatewayEventListener("interactionCreate")
    public async onInteractionCreate(interaction: Interaction) {
        if (!interaction.isAutocomplete() || interaction.commandName !== this.name) {
            return;
        }

        const focused = interaction.options.getFocused();
        const matches: ApplicationCommandOptionChoiceData[] = [];

        for (const code in this.languages) {
            if (matches.length >= 25) {
                break;
            }

            if (code === focused || this.languages[code].includes(focused)) {
                matches.push({
                    name: this.languages[code],
                    value: code
                });
            }
        }

        if (matches.length < 25) {
            for (const locale of this.supportedLocales) {
                if (matches.length >= 25) {
                    break;
                }

                if (this.languages[locale]) {
                    continue;
                }

                const displayName = this.displayNames.of(locale);

                if (!displayName) {
                    continue;
                }

                if (locale === focused || displayName.includes(focused)) {
                    matches.push({
                        name: displayName,
                        value: locale
                    });
                }
            }
        }

        interaction.respond(matches).catch(this.application.logger.error);
    }

    public override async execute(
        context: Context,
        args: TranslateCommandArgs | undefined
    ): Promise<void> {
        const text = context.isMessageContextMenu()
            ? context.commandMessage.targetMessage.content
            : args?.text;

        if (!text) {
            await context.error(
                context.isMessageContextMenu()
                    ? "The message does not contain any plain text."
                    : "You must provide text to translate."
            );
            return;
        }

        const to = (context.isChatInput() ? context.options.getString("to") : null) ?? "en";
        const from = (context.isChatInput() ? context.options.getString("from") : null) ?? "auto";

        try {
            if (from !== "auto" && !this.languages[from] && !this.displayNames.of(from)) {
                throw new Error();
            }
        }
        catch {
            await context.error("Invalid language specified in the `from` option");
            return;
        }

        try {
            if (to !== "auto" && !this.languages[to] && !this.displayNames.of(to)) {
                throw new Error();
            }
        }
        catch {
            await context.error("Invalid language specified in the `to` option");
            return;
        }

        const toString = this.displayNames.of(to);
        const { error, translation, response } = await this.translationService.translate(
            text,
            from,
            to
        );

        if (error) {
            await context.reply({
                embeds: [
                    new EmbedBuilder({
                        color: 0xf14a60,
                        author: {
                            name: "Translation Failed"
                        },
                        description: `${context.emoji("error") ?? ""} Couldn't translate that due to an internal error.`,
                        footer: {
                            text: "Powered by Google Translate"
                        }
                    }).setTimestamp()
                ]
            });

            return;
        }

        const fromString = this.displayNames.of(response!.data.src);

        await context.reply({
            embeds: [
                new EmbedBuilder({
                    color: 0x007bff,
                    author: {
                        name: context.isMessageContextMenu()
                            ? (context.commandMessage.targetMessage.author as User).username
                            : "Translation",
                        iconURL: context.isMessageContextMenu()
                            ? (
                                  context.commandMessage.targetMessage.author as User
                              ).displayAvatarURL()
                            : undefined
                    },
                    description: translation,
                    footer: {
                        text: `Translated from ${fromString ?? this.languages[response!.data.src] ?? response!.data.src} to ${
                            toString ?? this.languages[to] ?? to
                        } • Powered by Google Translate`
                    }
                })
            ]
        });
    }
}

export default TranslateCommand;
