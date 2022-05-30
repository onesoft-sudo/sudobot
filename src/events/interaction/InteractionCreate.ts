import BaseEvent from '../../utils/structures/BaseEvent';
import { GuildMember, Interaction, Message, MessageEmbed } from 'discord.js';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import AutoCompleteOptions from '../../types/AutoCompleteOptions';

export default class InteractionCreateEvent extends BaseEvent {
    constructor() {
        super('interactionCreate');
    }

    async run(client: DiscordClient, interaction: Interaction) {
        if (interaction.isCommand()) {
            await client.setMessage(interaction);

            const { commandName } = interaction;

            const command = await client.commands.get(commandName);

            if (command && command.supportsInteractions) {
                const allowed = await client.auth.verify(interaction.member! as GuildMember, command);

                if (!allowed) {
                    await interaction.reply({
                        embeds: [
                            new MessageEmbed()
                            .setColor('#f14a60')
                            .setDescription(":x: You don't have permission to run this command.")
                        ],
                        ephemeral: true
                    });

                    return;
                }

                const options = {
                    cmdName: commandName,
                    options: interaction.options,
                    isInteraction: true
                } as InteractionOptions;

                if (!await client.cooldown.start(interaction, options))
                    return;

                await command.run(client, interaction, options);
            }
        }
        else if (interaction.isAutocomplete()) {
            await client.setMessage(interaction);

            const { commandName } = interaction;

            const command = await client.commands.get(commandName);

            if (command && command.supportsInteractions) {
                const allowed = await client.auth.verify(interaction.member! as GuildMember, command);

                if (!allowed) {
                    return;
                }

                const options = {
                    cmdName: commandName,
                    options: interaction.options,
                    isInteraction: true,
                    optionName: interaction.options.getFocused(true).name,
                    query: interaction.options.getFocused(true).value.toString()
                } as AutoCompleteOptions;

                await command.autoComplete(client, interaction, options);
            }
        }
    }
}