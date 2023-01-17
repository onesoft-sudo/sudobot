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

export default class LookupCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    supportsLegacy: boolean = false;

    constructor() {
        super("profileinfo__set", "information", []);
    }

    async run(client: Client, interaction: CommandInteraction, options: InteractionOptions): Promise<void> {        
        const age = interaction.options.getInteger('age');
        const pronoun = interaction.options.getString('pronoun');
        const gender = interaction.options.getString('gender');

        if (!age && !pronoun && !gender) {
            await interaction.reply({
                content: 'Please specify at least one of the options to set.',
                ephemeral: true
            });

            return;
        }

        await interaction.deferReply({ ephemeral: true });

        const object: {
            age?: number | null | undefined,
            pronoun?: string | null | undefined,
            gender?: string | null | undefined,
            updatedAt: Date
        } = {
            updatedAt: new Date()
        };

        if (age === 0) {
            object.age = null;
        }
        else if (age) {
            object.age = age;
        }

        if (gender === 'None') {
            object.gender = null;
        }
        else if (gender) {
            object.gender = gender;
        }

        if (pronoun === 'None') {
            object.pronoun = null;
        }
        else if (pronoun) {
            object.pronoun = pronoun;
        }

        await Profile.findOneAndUpdate({
            user_id: interaction.user.id,
            guild_id: interaction.guildId!
        }, object, {
            upsert: true
        });

        await interaction.editReply({ content: "Successfully updated profile information." });
    }
}