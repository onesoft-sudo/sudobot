import { ColorResolvable, CommandInteraction, Util } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import InteractionOptions from '../../types/InteractionOptions';

export default class EmbedSchemaCommand extends BaseCommand {
    supportsInteractions: boolean = false;
    supportsLegacy: boolean = false;
    supportsContextMenu: boolean = false;    

    constructor() {
        super('embed__schema', 'automation', []);
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

        const embed = {
            author: author.name ? author : undefined,
            title: getString('title'),
            description: getString('description'),
            thumbnail: getString('thumbnail') ? {
                url: getString('thumbnail')
            } : undefined,
            image: getString('image') ? {
                url: getString('image')
            } : undefined,
            video: getString('video') ? {
                url: getString('video')
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
            url: getString('url'),
        };

        await interaction.reply({ content: `**Embed Schema**:\n\`\`\`\nembed:${JSON.stringify(embed)}\n\`\`\`\nYou can now use this schema to build embeds.` });
    }
}