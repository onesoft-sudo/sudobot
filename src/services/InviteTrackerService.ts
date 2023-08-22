/**
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2023 OSN Developers.
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

import { Collection, Guild, GuildMember, GuildPremiumTier, Invite, Snowflake, Vanity } from "discord.js";
import Service from "../core/Service";
import { GatewayEventListener } from "../decorators/GatewayEventListener";
import { HasEventListeners } from "../types/HasEventListeners";
import { log, logError } from "../utils/logger";
import { wait } from "../utils/utils";

export const name = "inviteTracker";

export default class InviteTrackerService extends Service implements HasEventListeners {
    public readonly invites = new Collection<`${Snowflake}_${string}`, number>();

    @GatewayEventListener("ready")
    async onReady() {
        log("Syncing the invites...", this.client.guilds.cache.size);

        for (const [, guild] of this.client.guilds.cache) {
            if (!this.client.configManager.config[guild.id]?.invite_tracking?.enabled) {
                continue;
            }

            try {
                const invites = await guild.invites.fetch();

                log("List", invites);

                for (const [, invite] of invites) {
                    log("Adding invite", invite.code);
                    this.invites.set(`${guild.id}_${invite.code}`, invite.uses ?? 0);
                }

                if (guild.premiumTier === GuildPremiumTier.Tier3) {
                    log("Fetching vanity info for guild ", guild.id);

                    try {
                        const vanity = guild.vanityURLUses !== null ? guild.vanityURLUses : (await guild.fetchVanityData()).uses;
                        this.invites.set(`${guild.id}_VANITY`, vanity);
                    } catch (e) {
                        logError(e);
                    }
                }

                await wait(1000);
            } catch (e) {
                logError(e);
            }
        }

        log("Successfully synced the invites");
    }

    @GatewayEventListener("inviteCreate")
    async onInviteCreate(invite: Invite) {
        log("Added new invite", invite.code);
        if (!invite.guild?.id || !this.client.configManager.config[invite.guild?.id ?? ""]?.invite_tracking?.enabled) {
            log("Invalid guild");
            return;
        }

        this.invites.set(`${invite.guild?.id}_${invite.code}`, invite.uses ?? 0);
    }

    @GatewayEventListener("inviteDelete")
    async onInviteDelete(invite: Invite) {
        log("Deleted invite", invite.code);
        if (!invite.guild?.id || !this.client.configManager.config[invite.guild?.id ?? ""]?.invite_tracking?.enabled) {
            log("Invalid guild");
            return;
        }

        this.invites.delete(`${invite.guild?.id}_${invite.code}`);
    }

    @GatewayEventListener("guildUpdate")
    async onGuildUpdate(oldGuild: Guild, newGuild: Guild) {
        if (!this.client.configManager.config[newGuild.id]?.invite_tracking?.enabled) {
            return;
        }

        if (newGuild.vanityURLCode === oldGuild.vanityURLCode && newGuild.vanityURLUses === oldGuild.vanityURLUses) {
            return;
        }

        if (oldGuild.vanityURLCode && !newGuild.vanityURLCode) {
            this.invites.delete(`${newGuild.id}_VANITY`);
        } else if (!oldGuild.vanityURLCode && newGuild.vanityURLCode) {
            this.invites.set(`${newGuild.id}_VANITY`, newGuild.vanityURLUses ?? 0);
        }
    }

    async findNewMemberInviteLink(member: GuildMember): Promise<
        | {
              isVanity: true;
              vanity: Vanity;
              invite: undefined;
          }
        | {
              isVanity: false;
              vanity: undefined;
              invite: Invite;
          }
        | undefined
    > {
        if (!this.client.configManager.config[member.guild.id]?.invite_tracking?.enabled) {
            return;
        }

        await wait(3500);
        const invites = await member.guild.invites.fetch();

        for (const [, invite] of invites) {
            const oldInviteCount = this.invites.get(`${member.guild.id}_${invite.code}`);

            if (oldInviteCount === undefined) {
                continue;
            }

            log("Compare", invite.code, oldInviteCount, invite.uses);

            if ((invite.uses ?? 0) > oldInviteCount) {
                this.invites.set(`${member.guild.id}_${invite.code}`, invite.uses ?? 0);
                return {
                    isVanity: false,
                    invite,
                    vanity: undefined
                };
            }
        }

        if (member.guild.premiumTier === GuildPremiumTier.Tier3) {
            try {
                const vanity = await member.guild.fetchVanityData();
                const oldVanityUses = this.invites.get(`${member.guild.id}_VANITY`);

                if (oldVanityUses === undefined) {
                    log("No vanity");
                    return;
                }

                log("Vanity", oldVanityUses, vanity.uses);

                if (vanity.uses > oldVanityUses) {
                    this.invites.set(`${member.guild.id}_VANITY`, vanity.uses);
                    return {
                        isVanity: true,
                        vanity,
                        invite: undefined
                    };
                }
            } catch (e) {
                logError(e);
            }
        }
    }
}
