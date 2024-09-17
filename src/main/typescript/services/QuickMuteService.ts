/*
* This file is part of SudoBot.
*
* Copyright (C) 2021-2024 OSN Developers.
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
import Duration from "@framework/datetime/Duration";
import { GatewayEventListener } from "@framework/events/GatewayEventListener";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { Events } from "@framework/types/ClientEvents";
import { HasEventListeners } from "@framework/types/HasEventListeners";
import { fetchMember } from "@framework/utils/entities";
import { xnor } from "@framework/utils/logic";
import type ConfigurationManager from "@main/services/ConfigurationManager";
import type InfractionManager from "@main/services/InfractionManager";
import type PermissionManagerService from "@main/services/PermissionManagerService";
import {
    ChannelType,
    User,
    type GuildTextBasedChannel,
    type MessageReaction,
    type PartialMessageReaction,
    type PartialUser
} from "discord.js";

@Name("quickMuteService")
class QuickMuteService extends Service implements HasEventListeners {
    @Inject("configManager")
    private readonly configManager!: ConfigurationManager;

    @Inject("infractionManager")
    private readonly infractionManager!: InfractionManager;

    @Inject("permissionManager")
    private readonly permissionManager!: PermissionManagerService;

    @GatewayEventListener(Events.MessageReactionAdd)
    public async onMessageReactionAdd(
        reaction: MessageReaction | PartialMessageReaction,
        user: User | PartialUser
    ): Promise<boolean> {
        const guildId = reaction.message.guildId;

        if (!guildId || !reaction.message.author) {
            this.logger.debug(
                "[QuickMuteService] Received MESSAGE_REACTION_ADD event without guildId or message author"
            );
            return false;
        }

        const config = this.configManager.get(guildId)?.quick_mute;

        if (!config?.enabled) {
            this.logger.debug(
                "[QuickMuteService] Received MESSAGE_REACTION_ADD event but quick mute is not enabled"
            );
            return false;
        }

        const isMute =
            (reaction.emoji.id && !!config.mute_emoji && reaction.emoji.id === config.mute_emoji) ||
            (!reaction.emoji.id &&
                !!config.mute_emoji &&
                reaction.emoji.identifier === config.mute_emoji);
        const isClearMute =
            (reaction.emoji.id &&
                !!config.mute_clear_emoji &&
                reaction.emoji.id === config.mute_clear_emoji) ||
            (!reaction.emoji.id &&
                !!config.mute_clear_emoji &&
                reaction.emoji.identifier === config.mute_clear_emoji);

        if (xnor(isMute, isClearMute)) {
            this.logger.debug(
                "[QuickMuteService] Received MESSAGE_REACTION_ADD event but the reaction is not a mute or clear mute reaction"
            );
            return false;
        }

        const guild = this.client.guilds.cache.get(guildId);

        if (!guild) {
            this.logger.debug(
                "[QuickMuteService] Received MESSAGE_REACTION_ADD event but the guild was not found"
            );
            return false;
        }

        let member = reaction.message.member;

        if (!member) {
            member = await fetchMember(guild, reaction.message.author.id);
        }

        if (!member) {
            this.logger.debug(
                "[QuickMuteService] Received MESSAGE_REACTION_ADD event but the member was not found"
            );
            return false;
        }

        const moderator = await fetchMember(guild, user.id);

        if (!moderator) {
            this.logger.debug(
                "[QuickMuteService] Received MESSAGE_REACTION_ADD event but the moderator was not found"
            );
            return false;
        }

        if (!(await this.permissionManager.canModerate(member, moderator))) {
            await reaction.remove().catch(this.logger.error);
            this.logger.debug(
                "[QuickMuteService] Received MESSAGE_REACTION_ADD event but the moderator does not have permission to mute"
            );
            return false;
        }

        const clearCondition =
            isClearMute &&
            reaction.message.channel.type !== ChannelType.DM &&
            reaction.message.channel.isTextBased();

        await this.infractionManager.createMute({
            guildId,
            member,
            moderator: user as User,
            reason: config.reason ?? "You have violated the server rules.",
            duration: Duration.fromMilliseconds(config.default_duration ?? 1000 * 60 * 60 * 2),
            notify: true,
            generateOverviewEmbed: false,
            channel: clearCondition
                ? (reaction.message.channel as GuildTextBasedChannel)
                : undefined,
            clearMessagesCount: clearCondition ? 50 : undefined
        });

        this.logger.debug("[QuickMuteService] Received MESSAGE_REACTION_ADD event");
        return true;
    }
}

export default QuickMuteService;
