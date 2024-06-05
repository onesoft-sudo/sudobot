import { Service } from "@framework/services/Service";
import { Name } from "@framework/services/Name";
import { Collection, type Guild, type Invite, type ReadonlyCollection, Snowflake } from "discord.js";
import type { HasEventListeners } from "@framework/types/HasEventListeners";
import { GatewayEventListener } from "@framework/events/GatewayEventListener";

@Name("inviteTrackingService")
class InviteTrackingService extends Service implements HasEventListeners {
    private readonly _invites = new Collection<`${Snowflake}::${string}`, InviteInfo>();

    public get invites(): ReadonlyCollection<`${Snowflake}::${string}`, InviteInfo> {
        return this._invites;
    }

    public override async boot() {
        for (const guild of this.client.guilds.cache.values()) {
            const invites = await guild.invites.fetch();

            for (const invite of invites.values()) {
                this._invites.set(`${guild.id}::${invite.code}`, {
                    type: "general",
                    invite,
                    guildId: guild.id
                });
            }

            if (guild.vanityURLCode) {
                this._invites.set(`${guild.id}::${guild.vanityURLCode}`, {
                    type: "vanity",
                    code: guild.vanityURLCode,
                    uses: guild.vanityURLUses ?? 0,
                    guildId: guild.id
                });
            }
        }

        this.application.logger.info(`Synchronized ${this._invites.size} invites`);
    }

    @GatewayEventListener("inviteCreate")
    public onInviteCreate(invite: Invite) {
        if (!invite.guild) {
            return;
        }

        this._invites.set(`${invite.guild.id}::${invite.code}`, {
            type: "general",
            invite,
            guildId: invite.guild.id
        });
    }

    @GatewayEventListener("inviteDelete")
    public onInviteDelete(invite: Invite) {
        if (!invite.guild) {
            return;
        }

        this._invites.delete(`${invite.guild.id}::${invite.code}`);
    }

    @GatewayEventListener("guildUpdate")
    public onGuildUpdate(oldGuild: Guild, newGuild: Guild) {
        if (oldGuild.vanityURLCode !== newGuild.vanityURLCode) {
            if (oldGuild.vanityURLCode) {
                this._invites.delete(`${oldGuild.id}::${oldGuild.vanityURLCode}`);
            }

            if (newGuild.vanityURLCode) {
                this._invites.set(`${newGuild.id}::${newGuild.vanityURLCode}`, {
                    type: "vanity",
                    code: newGuild.vanityURLCode,
                    uses: newGuild.vanityURLUses ?? 0,
                    guildId: newGuild.id
                });
            }
        }
    }
}

export type InviteInfo = {
    type: "general";
    invite: Invite;
    guildId: string;
} | {
    type: "vanity";
    code: string;
    uses: number;
    guildId: string;
};


export default InviteTrackingService;