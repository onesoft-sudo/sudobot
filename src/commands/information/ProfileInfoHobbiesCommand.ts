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

import { CommandInteraction } from "discord.js";
import Client from "../../client/Client";
import Profile from "../../models/Profile";
import InteractionOptions from "../../types/InteractionOptions";
import BaseCommand from "../../utils/structures/BaseCommand";

export default class ProfileInfoHobbiesCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    supportsLegacy: boolean = false;

    constructor() {
        super("profileinfo__hobbies", "information", []);
    }

    async run(client: Client, interaction: CommandInteraction, options: InteractionOptions): Promise<void> {
        const hobbies = interaction.options.getString('hobbies');
        const remove = interaction.options.getBoolean('remove');

        if (!hobbies && !remove) {
            await interaction.reply({
                content: 'Please specify at either the hobbies or the removal option if you want to remove your hobbiy information.',
                ephemeral: true
            });

            return;
        }
        
        if (hobbies && hobbies.length > 1000) {
            await interaction.reply({
                content: 'Your hobbies list must contain less than 1000 characters!',
                ephemeral: true
            });

            return;
        }

        await interaction.deferReply({ ephemeral: true });

        const object: {
            hobbies?: string | null | undefined,
            updatedAt: Date
        } = {
            updatedAt: new Date()
        };

        if (remove) {
            object.hobbies = null;
        }
        else if (hobbies) {
            object.hobbies = hobbies;
        }

        await Profile.findOneAndUpdate({
            user_id: interaction.user.id,
            guild_id: interaction.guildId!
        }, object, {
            upsert: true
        });

        await interaction.editReply({ content: "Successfully updated your hobbies." });
    }
}