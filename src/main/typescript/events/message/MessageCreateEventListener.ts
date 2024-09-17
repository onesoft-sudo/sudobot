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
import type { Logger } from "@framework/log/Logger";
import { Events } from "@framework/types/ClientEvents";
import type AIAutoModeration from "@main/automod/AIAutoModeration";
import type TriggerService from "@main/automod/TriggerService";
import type AFKService from "@main/services/AFKService";
import { Message, MessageType } from "discord.js";
import type RuleModerationService from "../../automod/RuleModerationService";
import type SpamModerationService from "../../automod/SpamModerationService";
import type CommandManager from "../../services/CommandManager";
import { safeMemberFetch } from "../../utils/fetch";

class MessageCreateEventListener extends EventListener<Events.MessageCreate> {
    public override readonly name = Events.MessageCreate;
    private readonly types = [MessageType.Default, MessageType.Reply];

    @Inject("logger")
    private readonly logger!: Logger;

    @Inject("commandManager")
    private readonly commandManager!: CommandManager;

    @Inject("ruleModerationService")
    private readonly ruleModerationService!: RuleModerationService;

    @Inject("spamModerationService")
    private readonly spamModerationService!: SpamModerationService;

    @Inject("triggerService")
    private readonly triggerService!: TriggerService;

    @Inject("afkService")
    private readonly afkService!: AFKService;

    @Inject("aiAutoModeration")
    private readonly aiAutoModeration!: AIAutoModeration;

    private readonly listeners: Array<(message: Message) => unknown> = [];

    public override async onInitialize() {
        this.listeners.push(
            this.ruleModerationService.onMessageCreate.bind(this.ruleModerationService),
            this.spamModerationService.onMessageCreate.bind(this.spamModerationService),
            this.aiAutoModeration.onMessageCreate.bind(this.aiAutoModeration),
            this.triggerService.onMessageCreate.bind(this.triggerService)
        );
    }

    public override async execute(message: Message<boolean>) {
        if (
            message.author.bot ||
            message.webhookId ||
            !message.inGuild() ||
            !this.types.includes(message.type)
        ) {
            return;
        }

        if (!message.member) {
            Reflect.set(message, "member", await safeMemberFetch(message.guild, message.author.id));
        }

        for (const listener of this.listeners) {
            if ((await listener(message)) === false) {
                return;
            }
        }

        await this.afkService.onMessageCreate(message).catch(this.application.logger.error);

        const value = await this.commandManager.runCommandFromMessage(message);

        if (value === false) {
            this.logger.debug("Command or snippet not found: all strategies failed");
        }
    }
}

export default MessageCreateEventListener;
