import type Context from "@framework/commands/Context";
import type { ContextReplyOptions } from "@framework/commands/Context";
import WizardButtonBuilder from "@framework/widgets/WizardButtonBuilder";
import type WizardManager from "@framework/widgets/WizardManager";
import type { ButtonInteraction } from "discord.js";
import {
    ActionRowBuilder,
    ButtonStyle,
    type AnyComponentBuilder,
    type Awaitable,
    type Message,
    type MessageEditOptions
} from "discord.js";
import { v4 as uuidv4 } from "uuid";

abstract class Wizard {
    private readonly manager: WizardManager;
    private readonly context: Context;
    private message: Message | null = null;
    private handlers: Record<string, string> = {};
    private readonly id = uuidv4();
    protected readonly inactivityTimeout: number = 300000; /* 5 minutes */
    private timeout: Timer | null = null;
    protected readonly states: ContextReplyOptions[] = [];

    public constructor(manager: WizardManager, context: Context) {
        this.context = context;
        this.manager = manager;
    }

    protected button(customId: string): WizardButtonBuilder {
        return new WizardButtonBuilder()
            .setCustomId(`w::${this.id}::${customId}`)
            .setStyle(ButtonStyle.Secondary);
    }

    protected row<T extends AnyComponentBuilder>(components: T[]) {
        return new ActionRowBuilder<T>().addComponents(...components);
    }

    protected abstract render(): Awaitable<ContextReplyOptions>;

    public async update(): Promise<void> {
        const options = this.states.at(-1) ?? (await this.render());

        this.handlers = {};

        if (typeof options === "object" && "components" in options) {
            for (const component of options.components ?? []) {
                if (component instanceof ActionRowBuilder) {
                    for (const button of component.components) {
                        if (button instanceof WizardButtonBuilder) {
                            this.handlers[button.customId] = button.handler;
                        }
                    }
                }
            }
        }

        if (!this.message) {
            this.message = await this.context.reply(options);
            this.manager.register(this.id, this);
            this.timeout = setTimeout(() => this.dispose(), this.inactivityTimeout);
        } else {
            await this.message.edit(options as MessageEditOptions);
        }
    }

    protected pushState(options: ContextReplyOptions) {
        this.states.push(options);
    }

    protected popState() {
        return this.states.pop();
    }

    protected async revertState(interaction?: ButtonInteraction) {
        const state = this.popState();

        if (interaction) {
            await interaction.deferUpdate();
        }

        if (state) {
            await this.update();
        }

        return state;
    }

    public async dispatch(interaction: ButtonInteraction, customId: string) {
        const handler = this.handlers[customId];

        if (this.timeout) {
            clearTimeout(this.timeout);
        }

        this.timeout = setTimeout(() => this.dispose(), this.inactivityTimeout);

        if (handler in this && typeof this[handler as keyof this] === "function") {
            const result = await (
                this as unknown as Record<
                    string,
                    (
                        interaction: ButtonInteraction,
                        customId: string
                    ) => Awaitable<ContextReplyOptions>
                >
            )[handler].call(this, interaction, customId);

            if (result) {
                this.pushState(result);

                if (!interaction.deferred) {
                    await interaction.deferUpdate();
                }

                await interaction.message.edit(result as MessageEditOptions);
            }
        }
    }

    public dispose() {
        this.manager.dispose(this.id);
    }
}

export default Wizard;
