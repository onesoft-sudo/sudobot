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
import NewMemberMessageInspectionService from "@main/automod/NewMemberMessageInspectionService";
import type TriggerService from "@main/automod/TriggerService";
import { getEnvData } from "@main/env/env";
import type AFKService from "@main/services/AFKService";
import { EndEventSymbol } from "@main/types/EndEvent";
import { ChannelType, Message, MessageType, WebhookClient } from "discord.js";
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

    @Inject("newMemberMessageInspectionService")
    private readonly newMemberMessageInspectionService!: NewMemberMessageInspectionService;

    @Inject("triggerService")
    private readonly triggerService!: TriggerService;

    @Inject("afkService")
    private readonly afkService!: AFKService;

    @Inject("aiAutoModeration")
    private readonly aiAutoModeration!: AIAutoModeration;

    private readonly listeners: Array<(message: Message) => unknown> = [];

    private dmLogWebhook: WebhookClient | null = null;

    public override onInitialize() {
        this.listeners.push(
            this.ruleModerationService.onMessageCreate.bind(this.ruleModerationService),
            this.spamModerationService.onMessageCreate.bind(this.spamModerationService),
            this.aiAutoModeration.onMessageCreate.bind(this.aiAutoModeration),
            this.triggerService.onMessageCreate.bind(this.triggerService),
            this.newMemberMessageInspectionService.onMessageCreate.bind(this.newMemberMessageInspectionService)
        );
    }

    public override async execute(message: Message<boolean>) {
        if (message.author.bot || message.webhookId || !this.types.includes(message.type)) {
            return;
        }

        const env = getEnvData();

        if (!message.inGuild()) {
            if (message.channel.type !== ChannelType.DM || !env.DM_LOGS_WEBHOOK_URL || message.author.bot) {
                return;
            }

            if (!this.dmLogWebhook) {
                this.dmLogWebhook = new WebhookClient({
                    url: env.DM_LOGS_WEBHOOK_URL
                });
            }

            this.dmLogWebhook
                .send({
                    content: message.content,
                    username: message.author.username,
                    avatarURL: message.author.displayAvatarURL(),
                    embeds: message.embeds,
                    files: message.attachments.map(a => a.proxyURL)
                })
                .catch(this.application.logger.error);

            return;
        }

        if (!message.member) {
            Reflect.set(message, "member", await safeMemberFetch(message.guild, message.author.id));
        }

        for (const listener of this.listeners) {
            if ((await listener(message)) === EndEventSymbol) {
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
