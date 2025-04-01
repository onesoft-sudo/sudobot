/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025 OSN Developers.
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

import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { HasEventListeners } from "@framework/types/HasEventListeners";
import WizardManager from "@framework/widgets/WizardManager";
import { Interaction } from "discord.js";

@Name("wizardManagerService")
class WizardManagerService extends Service implements HasEventListeners {
    public readonly manager: WizardManager = new WizardManager(this.application);

    public onInteractionCreate(interaction: Interaction) {
        if (interaction.isButton() && interaction.customId.startsWith("w::")) {
            const [, id] = interaction.customId.split("::");
            const wizard = this.manager.get(id);

            if (wizard) {
                wizard
                    .dispatch(interaction, interaction.customId)
                    .catch(this.application.logger.error);
            }
        }
    }
}

export default WizardManagerService;
