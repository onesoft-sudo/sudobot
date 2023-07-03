/**
* This file is part of SudoBot.
* 
* Copyright (C) 2021-2022 OSN Inc.
*
* SudoBot is free software; you can redistribute it and/or modify it
* under the terms of the GNU Affero General Public License as published by 
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* SudoBot is distributed in the hope that it will be useful, but
* WITHOUT ANY WARRANTY; without even the implied warranty of 
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the 
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License 
* along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
*/

import { ButtonInteraction, CacheType, CommandInteraction, GuildChannel, Interaction, Message, MessageActionRow, MessageButton, MessageCollector, Permissions, TextChannel, Util } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import MessageEmbed from '../../client/MessageEmbed';
import InteractionOptions from '../../types/InteractionOptions';
import { fetchEmoji } from '../../utils/Emoji';
import InteractionRole from '../../models/InteractionRole';
import InteractionRoleMessage from '../../models/InteractionRoleMessage';

export default class ButtonRoleCreateCommand extends BaseCommand {
    permissions = [Permissions.FLAGS.MANAGE_MESSAGES];

    constructor() {
        super('buttonrole__create', 'automation', []);
    }

    async action(client: DiscordClient, message: Message<boolean>, interactionBtn: ButtonInteraction) {
        await interactionBtn.reply("**Step 1**\nDo you want to have a custom text with your interaction role or the bot should generate it? Reply with '...' to generate message.");
        const collector = new MessageCollector(message.channel!, {
            filter(i) {
                console.log(i.author.id, interactionBtn.user.id);
                return i.author.id === interactionBtn.user.id;
            },
            time: 180_000,
        });

        let step = 1;
        let content = '', messageContent = '', autoGenerate = false, channel: TextChannel = message.channel! as TextChannel;
        const row = new MessageActionRow<MessageButton>();
        const insertedIDs: string[] = [];

        collector.on("collect", async collectedMessage => {
            console.log("Collected!");
            step++;

            if (collectedMessage.content === '--cancel') {
                await InteractionRole.deleteMany({ _id: { $in: insertedIDs } });
                collector.stop();
                await collectedMessage.react(fetchEmoji('check')!);
                return;
            }

            if (step === 2) {
                messageContent = collectedMessage.content;
                autoGenerate = messageContent.trim() === '...';

                await collectedMessage.reply("**Step 2**\nAwesome! Tell me which roles should I take care of, with name.\nThe format should be: `<roleID|roleMention> - <role title>` and each role should be in new lines and must not exceed 5 lines; Example:\n```\n@Test - Test Role\n363456217832361253 - Announcements\n```.\n\n*Waiting for your response...*");
            }
            else if (step === 3) {
                const tempMessage = await collectedMessage.reply("Please wait...");
                content = collectedMessage.content;
                
                const lines = content.split('\n');

                if (lines.length > 5) {
                    await collectedMessage.reply("I cannot create 5 role buttons at once!");
                    collector.stop();
                    tempMessage.delete().catch(console.error);
                    return;
                }

                if (messageContent.trim() === '...') {
                    messageContent = '';
                }

                let i = 0;
                
                for (const line of lines) {
                    i++;

                    const trimmed = line.trim();
                    const pos = trimmed.indexOf('-');

                    if (pos === -1) {
                        await collectedMessage.reply("You probably gave malformed entries. The role list must follow the structure/format given above.");
                        collector.stop();
                        tempMessage.delete().catch(console.error);
                        return;
                    }

                    const roleOrID = trimmed.substring(0, pos).trim();
                    const name = trimmed.substring(pos + 1).trim();

                    console.log(roleOrID, name);

                    try {
                        const role = roleOrID.startsWith('<@&') && roleOrID.endsWith('>') ? await message.guild!.roles.fetch(roleOrID.substring(3, roleOrID.length - 1)) : (await message.guild!.roles.fetch(roleOrID));

                        if (!role) {
                            throw new Error();
                        }

                        const interactionRole = await InteractionRole.create({
                            guild_id: message.guildId!,
                            role_id: role.id,
                            type: 'button',
                            createdAt: new Date()
                        });

                        insertedIDs.push(interactionRole.id);

                        if (autoGenerate) {
                            messageContent += `${role} • ${Util.escapeMarkdown(name)}\n`;
                        }

                        row.addComponents(
                            new MessageButton()
                                .setCustomId(`role__${interactionRole.id}__${role.id}`)
                                .setLabel(name)
                                .setStyle('SECONDARY')
                        );
                    }
                    catch (e) {
                        console.log(e);
                        
                        await collectedMessage.reply(`The role with ID ${roleOrID.startsWith('<@&') && roleOrID.endsWith('>') ? roleOrID.substring(3, roleOrID.length - 1) : roleOrID} (at position ${i}) is invalid or unable to fetch the role.`);
                        collector.stop();
                        tempMessage.delete().catch(console.error);
                        return;
                    }
                }
                
                tempMessage.delete().catch(console.error);
                await collectedMessage.reply("**Step 3**\nIn which channel you want the button role message to be? Tag it here or send the ID or send '...' to use the current channel.");
            }
            else if (step === 4) {
                if (collectedMessage.content.trim() !== '...') {
                    if (collectedMessage.mentions.channels.first()) {
                        channel = collectedMessage.mentions.channels.first() as TextChannel;
                    }
                    else {
                        try {
                            channel = <TextChannel> await message.guild?.channels.fetch(collectedMessage.content.trim());
                        }
                        catch (e) {
                            await collectedMessage.reply("Channel not found! Make sure the ID is correct.");
                            collector.stop();
                            return;
                        }
                    }

                    if (!['GUILD_TEXT', 'GUILD_NEWS', 'GUILD_NEWS_THREAD', 'GUILD_PUBLIC_THREAD', 'GUILD_PRIVATE_THREAD'].includes(channel.type)) {
                        await collectedMessage.reply("The given channel must be a text/announcement/thread channel!");
                        collector.stop();
                        return;
                    }
                }

                await collectedMessage.reply("**Step 4**\nAlright, I got it. Please confirm that everything is OK by typing `ok` in this channel.");
            }
            else if (step === 5) {
                if (collectedMessage.content.trim().toLowerCase() === 'ok') {
                    channel.send({
                        content: messageContent,
                        components: [
                            row
                        ],
                        allowedMentions: {
                            roles: []
                        }
                    }).then(async({ id, guildId }) => {
                        await InteractionRoleMessage.create({
                            dbIDs: insertedIDs,
                            createdAt: new Date(),
                            guild_id: guildId!,
                            message_id: id
                        });
                    }).catch(console.error);
                }
                else {
                    await InteractionRole.deleteMany({ _id: { $in: insertedIDs } });
                    collector.stop();
                    message.reply("Operation canceled.");
                }
            }
        });
    }

    async run(client: DiscordClient, message: CommandInteraction<CacheType> | Message<boolean>, options: CommandOptions | InteractionOptions): Promise<void> {
        let msg = <Message | CommandInteraction> await message.reply({
            embeds: [
                new MessageEmbed({
                    title: "Button Role Creation Wizard",
                    description: "This interactive wizard will help you to set up new button roles. Make sure that you respond in 3 minutes or otherwise the operation will be canceled. You can also manually cancel the operation by typing `--cancel` at any time, in this channel."
                })
            ],
            components: [
                new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setCustomId('rolecreate__start')
                            .setEmoji(fetchEmoji('ArrowRight')!)
                            .setLabel("Start Role Creation")
                            .setStyle('SECONDARY'),
                        new MessageButton()
                            .setCustomId('rolecreate__cancel')
                            .setEmoji(fetchEmoji('error')!)
                            .setLabel("Cancel")
                            .setStyle('SECONDARY')
                    )
            ]
        });

        if (message instanceof CommandInteraction) {
            msg = <Message> await message.fetchReply();
        }

        message.channel!.awaitMessageComponent({
            componentType: 'BUTTON',
            dispose: true,
            time: 120_000,
            filter: i => i.guild.id === message.guildId! && i.member.user.id === message.member!.user.id
        })
        .then(async interaction => {
            if (interaction.customId !== 'rolecreate__start') {
                await interaction.reply("Operation canceled.");
                return Promise.reject();
            }

            let msg = message;

            if (message instanceof CommandInteraction) {
                msg = <Message> await message.fetchReply();
            }

            this.action(client, msg as Message, interaction);
        })
        .catch(console.error)
        .finally(() => {
            const row = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId('rolecreate__start')
                        .setEmoji(fetchEmoji('ArrowRight')!)
                        .setLabel("Start Role Creation")
                        .setStyle('SECONDARY')
                        .setDisabled(true),
                    new MessageButton()
                        .setCustomId('rolecreate__cancel')
                        .setEmoji(fetchEmoji('error')!)
                        .setLabel("Cancel")
                        .setStyle('SECONDARY')
                        .setDisabled(true)
                );

            if (msg instanceof Message) {
                msg.edit({ components: [row] }).catch(console.error);
            }
            else if (msg instanceof CommandInteraction) {
                msg.editReply({ components: [row] }).catch(console.error);
            }
        });
    }
}