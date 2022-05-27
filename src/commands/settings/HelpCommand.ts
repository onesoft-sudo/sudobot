import { CommandInteraction, Interaction, Message } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import Help from '../../utils/help';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';

export default class HelpCommand extends BaseCommand {
    constructor() {
        super('help', 'settings', ['?']);
        this.supportsInteractions = true;
    }

    async render() {
        let string = '';

        for (let cmd of Help.commands) {
            string += `\n\n**${cmd.name}**\n${cmd.shortBrief}`;
        }

        return string;
    }

    async run(client: DiscordClient, message: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if ((options.isInteraction && !options.options.getString('command')) || (!options.isInteraction && options.args[0] === undefined)) {
            await message.reply({
                embeds: [
                    new MessageEmbed()
                    .setDescription("The command list.\n\n`<...>` means required argument, `[...]` means optional argument.\n\nRun `" + client.config.get('prefix') + "help <commandName>` for more information about a specific command.\n" + await this.render())
                    .setTitle('Help')
                ],
            });

            return;
        }

        const commandName = options.isInteraction ? options.options.getString('command') : options.args[0];
        const cmd = Help.commands.find(c => c.name === commandName);

        if (!cmd) {
            await message.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`Invalid command \`${commandName}\`.`)
                ]
            });

            return;
        }

        let fields = [
            {
                name: "Usage",
                value: `\`${client.config.get('prefix')}${cmd.name}\`` + (cmd.structure.trim() !== '' ? ` \`${cmd.structure}\`` : '')
            },
            {
                name: 'Examples',
                value: cmd.example.replace(/\%\%/g, client.config.get('prefix'))
            }
        ];

        if (cmd.options !== undefined) {
            let str = '';

            for (let opt in cmd.options)
                str += `\`${opt}\` - ${cmd.options[opt]}\n`;

            str = str.substring(0, str.length - 1);

            fields.push({
                name: 'Options',
                value: str
            });
        }

        if (cmd.notes !== null) {
            fields.push({
                name: "Notes",
                value: cmd.notes
            });
        }

        await message.reply({
            embeds: [
                new MessageEmbed()
                .setTitle(`${client.config.get('prefix')}${cmd.name}`)
                .setDescription("`<...>` means required argument, `[...]` means optional argument.\n\n" + (cmd.description !== null ? cmd.description : cmd.shortBrief))
                .addFields(fields)
            ]
        });
    }
}