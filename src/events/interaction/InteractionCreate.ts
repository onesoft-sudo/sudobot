import BaseEvent from '../../utils/structures/BaseEvent';
import { GuildMember, Interaction, Message, MessageEmbed } from 'discord.js';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';

export default class InteractionCreateEvent extends BaseEvent {
    constructor() {
        super('interactionCreate');
    }

    async run(client: DiscordClient, interaction: Interaction) {
        console.log('inside');
        
        if (interaction.isCommand()) {
            await client.setMessage(interaction);

            const { commandName } = interaction;

            const command = await client.commands.get(commandName);
            const allowed = await client.auth.verify(interaction.member! as GuildMember, commandName);

            if (command && command.supportsInteractions) {
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

                await command.run(client, interaction, {
                    cmdName: commandName,
                    options: interaction.options,
                    isInteraction: true
                } as InteractionOptions);
            }
        }
    }
}