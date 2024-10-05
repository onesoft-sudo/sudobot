/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
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

import { Inject } from "@framework/container/Inject";
import EventListener from "@framework/events/EventListener";
import { Events } from "@framework/types/ClientEvents";
import type VerificationService from "@main/automod/VerificationService";
import type WizardManagerService from "@main/services/WizardManagerService";
import { Interaction } from "discord.js";
import type CommandManager from "../../services/CommandManager";

class InteractionCreateEventListener extends EventListener<Events.InteractionCreate> {
    public override readonly name = Events.InteractionCreate;

    @Inject("commandManager")
    private readonly commandManager!: CommandManager;

    @Inject("verificationService")
    private readonly verificationService!: VerificationService;

    @Inject("wizardManagerService")
    private readonly wizardManagerService!: WizardManagerService;

    public override async execute(interaction: Interaction): Promise<void> {
        if (interaction.isCommand()) {
            await this.commandManager.runCommandFromInteraction(interaction);
        }

        if (interaction.isButton()) {
            await this.verificationService.onInteractionCreate(interaction);
            this.wizardManagerService.onInteractionCreate(interaction);
        }
    }
}

export default InteractionCreateEventListener;
