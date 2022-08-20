import { ColorResolvable, CommandInteraction, Message, Util } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';

export default class EmbedCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    supportsLegacy: boolean = false;

    constructor() {
        super('embed', 'automation', []);
    }

    async run(client: DiscordClient, interaction: CommandInteraction, options: InteractionOptions) {
        const getString = (field: string): string | undefined => {
            return options.options.getString(field) ?? undefined;
        };

        const author = {
            name: getString('author_name'),
            iconURL: getString('author_iconurl'),
        };

        const footer = {
            text: getString('footer_text'),
            iconURL: getString('footer_iconurl'),
        };

        if (getString('color') && (!Util.resolveColor(getString('color') as ColorResolvable) || Util.resolveColor(getString('color') as ColorResolvable) === NaN)) {
            await interaction.reply({ content: "Invalid color given.", ephemeral: true });
            return;
        }

        const embed = new MessageEmbed({
            author: author.name ? author : undefined,
            title: getString('title'),
            description: getString('description'),
            thumbnail: getString('thumbnail') ? {
                url: getString('thumbnail')
            } : undefined,
            image: getString('image') ? {
                url: getString('image')
            } : undefined,
            footer: footer.text ? footer : undefined,
            color: (getString('color') ?? '#007bff') as ColorResolvable,
            timestamp: getString('timestamp') ? (getString('timestamp') === 'current' ? new Date() : new Date(getString('timestamp')!)) : undefined,
            fields: getString('fields') ? getString('fields')!.trim().split(',').map(fieldData => {
                const [name, value] = fieldData.trim().split(':');

                return {
                    name: name.trim(),
                    value: value.trim(),
                };
            }) : [],
            url: getString('url')
        });

        try {
            await interaction.channel?.send({
                embeds: [embed]
            });

            await interaction.reply({ content: 'Message sent.', ephemeral: true });
        }
        catch (e) {
            console.log(e);
            interaction.reply({ content: 'Invalid options given.', ephemeral: true });
        }
    }
}