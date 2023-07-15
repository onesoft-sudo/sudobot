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

import { ButtonInteraction, GuildMember, MessageActionRow, MessageButton, MessageEmbed, TextChannel, Util, Message } from "discord.js";
import fs from 'fs';
import path from "path";
import Service from "../utils/structures/Service";
import { hasConfig } from "../utils/util";
import { emoji } from "../utils/Emoji";

export default class Welcomer extends Service {
    messages: string[] = JSON.parse(fs.readFileSync(path.resolve(process.env.SUDO_PREFIX ?? path.join(__dirname, '..', '..'), 'resources', 'welcome_messages.json')).toString());

    generateMessageOptions(member: GuildMember, index?: number) {
        const { message, randomize, embed } = this.client.config.props[member.guild.id].welcomer;
        let content: string = message ?? '';

        if (randomize) {
            content = this.generateMessage(index) + (message ? "\n" + content : '');
        }

        if (content.trim() === '') {
            return false;
        }

        content = content
            .replace(/:name:/g, member.displayName)
            .replace(/:tag:/g, member.user.tag)
            .replace(/:username:/g, member.user.username)
            .replace(/:discrim:/g, member.user.discriminator)
            .replace(/:avatar:/g, member.displayAvatarURL())
            .replace(/:date:/g, `<t:${member.joinedAt?.getTime()}>`)
            .replace(/:guild:/g, member.guild.name)
            .replace(/:mention:/g, member.toString());

        return {
            content: member.toString() + (
                !embed ? "\n" + content : ""
            ),
            embeds: embed ? [
                new MessageEmbed({
                    author: {
                        iconURL: member.displayAvatarURL(),
                        name: member.user.tag
                    },
                    description: content,
                    footer: {
                        text: 'Welcome'
                    }
                })
                    .setColor('#007bff')
                    .setTimestamp()
            ] : [],
            components: [
                this.createComponent(member.user.id)
            ]
        };
    }

    createComponent(memberId: string) {
        return new MessageActionRow<MessageButton>()
                .addComponents(
                    new MessageButton()
                        .setCustomId(`say_hi__${memberId}`)
                        .setLabel('Say Hi')
                        .setEmoji(emoji('wave')! as any)
                        .setStyle("SECONDARY")
                );
    }

    async onButtonInteraction(interaction: ButtonInteraction) {
        console.log(interaction.customId);

        if (!interaction.customId.startsWith("say_hi__"))
            return;

        let [, memberId, messageId] = interaction.customId.split('__');

        if (messageId)
            await interaction.deferUpdate();

        try {
            if (!messageId) {
                await interaction.reply({
                    content: interaction.user.id === memberId ? `<@${memberId}>, you said Hi to yourself!` : `<@${memberId}>, **${Util.escapeMarkdown(interaction.user.username)}** says Hi to you!`,
                    allowedMentions: {
                        users: []
                    }
                });

                const reply = <Message> await interaction.fetchReply();
                const component = this.createComponent(memberId);

                component.components[0].setCustomId(`say_hi__${memberId}__${reply.id}`);
                
                await (interaction.message as Message).edit({
                    components: [
                        component
                    ],
                    allowedMentions: {
                        users: []
                    }
                });

                messageId = reply.id;
            }
            else {
                const message = await interaction.channel!.messages.fetch(messageId);
                
                if (!message)
                    throw new Error();

                await message.edit({
                    content: interaction.user.id === memberId ? `<@${memberId}>, you said Hi to yourself!` : `<@${memberId}>, **${Util.escapeMarkdown(interaction.user.username)}** says Hi to you!`,
                    allowedMentions: {
                        users: []
                    }
                });

                await interaction.update({
                    content: interaction.message.content
                });
            }
        }
        catch (e) {
            console.log(e);
            return;
        }
    }

    async start(member: GuildMember, index?: number) {
        if (!hasConfig(this.client, member.guild.id, "welcomer"))
            return;

        if (this.client.config.props[member.guild.id].welcomer.enabled) {
            const { channel: channelID } = this.client.config.props[member.guild.id].welcomer;

            try {
                const channel = (await member.guild.channels.fetch(channelID)) as TextChannel;
                const options = this.generateMessageOptions(member, index);

                if (!options) {
                    return;
                }

                if (channel) {
                    await channel.send(options);
                }
            }
            catch (e) {
                console.log(e);
            }
        }
    }

    generateMessage(index?: number) {
        return this.messages[index ?? Math.floor(this.messages.length * Math.random())];
    }
}
