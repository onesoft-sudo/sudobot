import { CommandInteraction, Message, Role } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import getRole from '../../utils/getRole';

export default class RoleListCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('rolelist', 'information', []);
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        let role: Role | null = null;

        if (options.isInteraction) {
            if (options.options.getRole('role'))
                role = <Role> options.options.getRole('role');
        }
        else {
            if (options.args[0])
                try {
                    role = <Role> await getRole(<Message> msg, options);

                    if (!role) {
                        throw new Error();
                    }
                }
                catch (e) {
                    console.log(e);
                    
                    await msg.reply({
                        embeds: [
                            new MessageEmbed()
                            .setColor('#f14a60')
                            .setDescription('Failed to fetch role info. Maybe invalid role ID?')
                        ]
                    });

                    return;
                }
        }

        if (!role) {
            const roles = await msg.guild!.roles.cache.toJSON();
            let str = ``;

            for await (const role of roles) {
                if (role.id === msg.guild!.id)
                    continue;
                
                str += `${role.name} - ${role.id} - ${role.members.size} Members - ${role.hexColor}\n`;
            }

            await msg.reply({
                content: "**Role List**:\n\n```" + str + '```'
            });
        }
        else {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setAuthor({
                        name: `Role Information`
                    })
                    .setColor(role.hexColor)
                    .addFields([
                        {
                            name: 'Name',
                            value: role.name
                        },
                        {
                            name: 'Color',
                            value: role.hexColor
                        },
                        {
                            name: 'Members',
                            value: role.members.size + ''
                        },
                        {
                            name: 'Bot Role',
                            value: role.members.size === 1 && role.members.first()?.user.bot ? 'Yes' : 'No'
                        }
                    ])
                ]
            });
        }
    }
}