
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