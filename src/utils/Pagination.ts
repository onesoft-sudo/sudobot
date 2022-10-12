import DiscordClient from "../client/Client";
import MessageEmbed from "../client/MessageEmbed";
import { v4 as uuid } from 'uuid';
import { ButtonInteraction, InteractionCollector, InteractionReplyOptions, Message, MessageActionRow, MessageButton, MessageEditOptions, MessageOptions, ReplyMessageOptions } from "discord.js";
import { emoji } from "./Emoji";

export interface EmbedBuilderOptions<T> {
    data: Array<T>;
    currentPage: number;
    maxPages: number;
}

export interface PaginationOptions<T> {
    limit: number;
    guild_id: string;
    channel_id: string;
    user_id?: string;
    timeout?: number;
    embedBuilder: (options: EmbedBuilderOptions<T>) => MessageEmbed;
    actionRowBuilder?: (options: { first: boolean, last: boolean, next: boolean, back: boolean }) => MessageActionRow<MessageButton>;
}

export default class Pagination<T> {
    protected readonly client = DiscordClient.client;
    protected readonly id: string;
    protected currentPage: number = 1;

    constructor(protected readonly data: Array<T> = [], protected readonly options: PaginationOptions<T>) {
        this.id = uuid();
    }

    getOffset(page: number = 1) {
        return (page - 1) * this.options.limit;
    }

    getPaginatedData(page: number = 1) {
        console.log(page, this.getOffset(page));
        return this.data.slice(this.getOffset(page), this.getOffset(page) + this.options.limit);
    }

    getEmbed(page: number = 1): MessageEmbed {
        return this.options.embedBuilder({
            data: this.getPaginatedData(page),
            currentPage: this.currentPage,
            maxPages: Math.ceil(this.data.length / this.options.limit),
        });
    }

    getMessageOptions(page: number = 1, actionRowOptions: { first: boolean, last: boolean, next: boolean, back: boolean } | undefined = undefined, optionsToMerge: ReplyMessageOptions & MessageOptions & InteractionReplyOptions & MessageEditOptions = {}) {
        const options = {...optionsToMerge};
        const actionRowOptionsDup = actionRowOptions ? {...actionRowOptions} : { first: true, last: true, next: true, back: true };

        if (actionRowOptionsDup && page <= 1) {
            actionRowOptionsDup.back = false;
            actionRowOptionsDup.first = false;
        }

        if (actionRowOptionsDup && page >= Math.ceil(this.data.length / this.options.limit)) {
            actionRowOptionsDup.last = false
            actionRowOptionsDup.next = false;
        }

        options.embeds ??= [];
        options.embeds.push(this.getEmbed(page));
        
        options.components ??= [];
        options.components.push(this.getActionRow(actionRowOptionsDup));

        return options;
    }

    getActionRow({ first, last, next, back }: { first: boolean, last: boolean, next: boolean, back: boolean } = { first: true, last: true, next: true, back: true }) {
        if (this.options.actionRowBuilder) {
            return this.options.actionRowBuilder({ first, last, next, back });
        }

        const actionRow = new MessageActionRow<MessageButton>();

        actionRow.addComponents(
            new MessageButton()
                .setCustomId(`pagination_first_${this.id}`)
                .setStyle("PRIMARY")
                .setDisabled(!first)
                .setEmoji(emoji('ChevronLeft')!),
            new MessageButton()
                .setCustomId(`pagination_back_${this.id}`)
                .setStyle("PRIMARY")
                .setDisabled(!back)
                .setEmoji(emoji('ArrowLeft')!),
            new MessageButton()
                .setCustomId(`pagination_next_${this.id}`)
                .setStyle("PRIMARY")
                .setDisabled(!next)
                .setEmoji(emoji('ArrowRight')!),
            new MessageButton()
                .setCustomId(`pagination_last_${this.id}`)
                .setStyle("PRIMARY")
                .setDisabled(!last)
                .setEmoji(emoji('ChevronRight')!)
        );

        return actionRow;
    }

    async start(message: Message) {
        const collector = new InteractionCollector(this.client, {
            guild: this.options.guild_id,
            channel: this.options.channel_id,
            interactionType: 'MESSAGE_COMPONENT',
            componentType: 'BUTTON',
            message,
            time: this.options.timeout ?? 60_000,
            filter: interaction => {
                if (interaction.inGuild() && (!this.options.user_id || interaction.user.id === this.options.user_id)) {
                    return true;
                }

                if (interaction.isRepliable()) {
                    interaction.reply({ content: 'That\'s not under your control or the button controls are expired', ephemeral: true });
                }

                return false;
            },
        });

        collector.on("collect", async (interaction: ButtonInteraction) => {
            if (!interaction.customId.endsWith(this.id)) {
                return;
            }

            // await interaction.deferUpdate();
            
            const maxPage = Math.ceil(this.data.length / this.options.limit);
            const componentOptions = { first: true, last: true, next: true, back: true };

            if ([`pagination_next_${this.id}`, `pagination_back_${this.id}`].includes(interaction.customId)) {
                console.log('here');

                if (this.currentPage >= maxPage && interaction.customId === `pagination_next_${this.id}`) {
                    console.log('here');
                    await interaction.reply({ content: maxPage === 1 ? "This is the only page!" : "You've reached the last page!", ephemeral: true });
                    return;
                }

                if (this.currentPage <= 1 && interaction.customId === `pagination_back_${this.id}`) {
                    console.log('here');
                    await interaction.reply({ content: maxPage === 1 ? "This is the only page!" : "You're in the very first page!", ephemeral: true });
                    return;
                }
            }

            if (interaction.customId === `pagination_first_${this.id}`)
                this.currentPage = 1;
            else if (interaction.customId === `pagination_last_${this.id}`)
                this.currentPage = maxPage;            

            await interaction.update(this.getMessageOptions(
                interaction.customId === `pagination_first_${this.id}` ? 1 : 
                    interaction.customId === `pagination_last_${this.id}` ? maxPage :
                        (interaction.customId === `pagination_next_${this.id}` ? (this.currentPage >= maxPage ? this.currentPage : ++this.currentPage) : --this.currentPage),
                componentOptions,
                {
                    embeds: []
                }
            ));
        });

        collector.on("end", async () => {
            const component = message.components[0]; // this.getActionRow({ first: false, last: false, next: false, back: false })

            for (const i in component.components) {
                component.components[i].disabled = true;
            }

            await message.edit({ components: [component] });
        });
    }
}