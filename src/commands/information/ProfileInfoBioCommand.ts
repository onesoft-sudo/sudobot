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

export default class ProfileInfoBioCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    supportsLegacy: boolean = false;

    constructor() {
        super("profileinfo__bio", "information", []);
    }

    async run(client: Client, interaction: CommandInteraction, options: InteractionOptions): Promise<void> {
        const bio = interaction.options.getString('bio');
        const remove = interaction.options.getBoolean('remove');

        if (!bio && !remove) {
            await interaction.reply({
                content: 'Please specify at either the bio or the removal option if you want to remove your bio.',
                ephemeral: true
            });

            return;
        }

        if (bio && bio.length > 2000) {
            await interaction.reply({
                content: 'Your bio must contain less than 2000 characters!',
                ephemeral: true
            });

            return;
        }

        await interaction.deferReply({ ephemeral: true });

        const object: {
            bio?: string | null | undefined,
            updatedAt: Date
        } = {
            updatedAt: new Date()
        };

        if (remove) {
            object.bio = null;
        }
        else if (bio) {
            object.bio = bio;
        }

        await Profile.findOneAndUpdate({
            user_id: interaction.user.id,
            guild_id: interaction.guildId!
        }, object, {
            upsert: true
        });

        await interaction.editReply({ content: "Successfully updated your bio." });
    }
}