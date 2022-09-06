import BaseEvent from '../../utils/structures/BaseEvent';
import { GuildMember } from 'discord.js';
import DiscordClient from '../../client/Client';
import { ModalSubmitInteraction } from 'discord-modals';

export default class ModalSubmitEvent extends BaseEvent {
    constructor() {
        super('modalSubmit');
    }

    async run(client: DiscordClient, interaction: ModalSubmitInteraction) {
        if (!interaction.guild || !interaction.channel || interaction.channel.type === 'DM') {
            if (interaction.isRepliable())
                await interaction.reply({
                    content: 'You cannot use this bot on DMs.',
                    ephemeral: true
                }); 

            return;
        }   

        if ((global as any).lastCommand) {
            const cmd = client.commands.get((global as any).lastCommand);

            if (cmd && cmd.supportsInteractions) {
                const allowed = await client.auth.verify(interaction.member! as GuildMember, cmd);

                if (!allowed) {
                    return;
                }

                await cmd.modalSubmit(client, interaction);
            }
        }
    }
}