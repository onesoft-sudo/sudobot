import { CategoryChannel, CommandInteraction, Message, TextChannel, Permissions, PermissionFlags, PermissionString, GuildChannel, Role, AutocompleteInteraction, Interaction, Collection } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import getUser from '../../utils/getUser';
import History from '../../automod/History';
import { fetchEmoji } from '../../utils/Emoji';
import getRole, { getRoleRaw } from '../../utils/getRole';
import { channelMention } from '@discordjs/builders';
import AutoCompleteOptions from '../../types/AutoCompleteOptions';

export default class SetChPermsCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('setchperms', 'moderation', []);
    }

    async autoComplete(client: DiscordClient, interaction: AutocompleteInteraction, options: AutoCompleteOptions) {
        if (interaction.commandName === this.getName()) {
            const focused = interaction.options.getFocused(true);

            console.log(focused);            

            if (focused.name === 'permission') {
                const { FLAGS } = Permissions;
                const responseArray = [];
                const perms: (keyof typeof FLAGS)[] = [
                    'SEND_MESSAGES',
                    'ATTACH_FILES',
                    'EMBED_LINKS',
                    'MANAGE_MESSAGES',
                    'MENTION_EVERYONE',
                    'USE_APPLICATION_COMMANDS',
                    'USE_EXTERNAL_EMOJIS',
                    'USE_EXTERNAL_STICKERS'
                ];

                for await (const key of perms) {
                    if (key.includes(focused.value.toString())) {
                        responseArray.push({
                            name: key,
                            value: key
                        });
                    }
                }

                console.log(responseArray);                

                await interaction.respond(responseArray);
            }
        }
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {        
        if (!options.isInteraction && typeof options.args[3] === 'undefined') {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`This command requires at least four arguments.`)
                ]
            });

            return;
        }

        if (msg instanceof CommandInteraction)
            await msg.deferReply();
        else {
            msg = await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('GOLD')
                    .setDescription((await fetchEmoji('loading'))?.toString() + ' Working...')
                ]
            });
        }

        const { FLAGS } = Permissions;
        
        let channels: (TextChannel | CategoryChannel)[] = [];
        let permKey: PermissionString;
        let permValue: null | boolean = null;
        let role: Role;

        if (options.isInteraction) {
            channels.push(<TextChannel | CategoryChannel> options.options.getChannel('channel'));

            if (channels[0].type !== 'GUILD_CATEGORY' && channels[0].type !== 'GUILD_TEXT') {
                await this.deferReply(msg, {
                    content: (await fetchEmoji('error'))?.toString() + ' The channel with ID ' + (channels[0] as GuildChannel).id + ' is not a text channel or category.',
                    embeds: []
                }, true);

                return;
            }
            else if (channels[0].type === 'GUILD_CATEGORY') {
                const ch = channels[0];
                channels = [];

                const matching = <Collection<string, TextChannel>> await msg.guild!.channels.cache.filter(c => c.parent?.id === ch.id && c.type === 'GUILD_TEXT');
                channels = matching.toJSON();
            }

            permKey = <PermissionString> options.options.getString('permission');
            
            if (FLAGS[permKey] === undefined) {
                await this.deferReply(msg, {
                    content: (await fetchEmoji('error'))?.toString() + ' Invalid permission key given.',
                    embeds: []
                }, true);

                return;
            }

            const permValueInput = <string> options.options.getString('value');

            if (permValueInput === 'true')
                permValue = true;
            else if (permValueInput === 'false')
                permValue = false;
            else
                permValue = null;

            role = <Role> options.options.getRole('role');
        }
        else {
            const permValueInput = options.args.pop();

            if (permValueInput === 'true')
                permValue = true;
            else if (permValueInput === 'false')
                permValue = false;
            else if (permValueInput === 'null')
                permValue = null;
            else {
                await this.deferReply(msg, {
                    content: (await fetchEmoji('error'))?.toString() + ' Invalid permission value given, permission values must be one of these: `null`, `true`, `false`.',
                    embeds: []
                }, true);

                return;
            }

            permKey = <PermissionString> options.args.pop();

            if (FLAGS[permKey] === undefined) {
                await this.deferReply(msg, {
                    content: (await fetchEmoji('error'))?.toString() + ' Invalid permission key given.',
                    embeds: []
                }, true);

                return;
            }

            if (options.args[options.args.length - 1] === 'everyone') {
                role = msg.guild!.roles.everyone;
            }
            else {
                try {
                    role = <Role> await getRoleRaw(options.args[options.args.length - 1], msg.guild!);
    
                    if (!role)
                        throw new Error();
                }
                catch (e) {
                    console.log(e);
                    
                    await this.deferReply(msg, {
                        content: (await fetchEmoji('error'))?.toString() + ' Invalid role given.',
                        embeds: []
                    }, true);
    
                    return;
                }
            }

            options.args.pop();

            for await (let chID of options.args) {
                if (/^\d+$/g.test(chID)) {
                    let channel: CategoryChannel | TextChannel;

                    try {
                        channel = <typeof channel> (await msg.guild!.channels.fetch(chID))!;

                        if (channel.type !== 'GUILD_CATEGORY' && channel.type !== 'GUILD_TEXT') {
                            await this.deferReply(msg, {
                                content: (await fetchEmoji('error'))?.toString() + ' The channel with ID ' + chID + ' is not a text channel or category.',
                                embeds: []
                            }, true);
    
                            return;
                        }

                        if (channel.type === 'GUILD_CATEGORY') {
                            channels = [...channel.children.filter(c => c.type === 'GUILD_TEXT').toJSON() as TextChannel[], ...channels];
                            continue;
                        }
                    }
                    catch (e) {
                        console.log(e);
                        
                        await this.deferReply(msg, {
                            content: (await fetchEmoji('error'))?.toString() + ' The channel with ID ' + chID + ' could not be fetched.',
                            embeds: []
                        }, true);

                        return;
                    }
                    
                    channels.push(channel);
                }
            }
        }

        if (FLAGS[permKey] === undefined) {
            await this.deferReply(msg, {
                content: (await fetchEmoji('error'))?.toString() + ' Invalid permission key given.',
                embeds: []
            }, true);

            return;
        }

        let affected = '';

        for await (const channel of channels) {
            try {
                await channel.permissionOverwrites.edit(role, {
                    [permKey]: permValue
                });

                affected += `${channelMention(channel.id)} (${channel.id})\n`;
            }
            catch (e) {
                console.log(e);
                
                await this.deferReply(msg, {
                    content: (await fetchEmoji('error'))?.toString() + ' Failed to set permissions for channel ' + channel.id,
                    embeds: []
                }, true);
    
                return;
            }
        }

        await this.deferReply(msg, {
            embeds: [
                new MessageEmbed()
                .setColor('GREEN')
                .setDescription(`${(await fetchEmoji('check'))?.toString()} Permissions updated!\nThese channels were affected:\n\n${affected}`)
            ]
        }, true);
    }
}