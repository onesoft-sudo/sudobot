import { Inject } from "@framework/container/Inject";
import Duration from "@framework/datetime/Duration";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { HasEventListeners } from "@framework/types/HasEventListeners";
import type ConfigurationManager from "@main/services/ConfigurationManager";
import type InfractionManager from "@main/services/InfractionManager";
import { GuildMember } from "discord.js";

@Name("antiMemberJoinService")
class AntiMemberJoinService extends Service implements HasEventListeners {
    @Inject("configManager")
    private readonly configManager!: ConfigurationManager;

    @Inject("infractionManager")
    private readonly infractionManager!: InfractionManager;

    public async onGuildMemberAdd(member: GuildMember) {
        const config = this.configManager.config[member.guild.id]?.anti_member_join;

        if (!config?.enabled) {
            return;
        }

        const { custom_reason, ignore_bots, behavior, ban_duration } = config;

        if (ignore_bots && member.user.bot) {
            return;
        }

        const reason =
            custom_reason ?? "Automatic: This server is not accepting new members at the moment.";

        if (behavior === "kick") {
            if (!member.kickable) {
                return;
            }

            await this.infractionManager.createKick({
                guildId: member.guild.id,
                member,
                reason,
                moderator: this.client.user!
            });
        } else if (behavior === "ban") {
            if (!member.bannable) {
                return;
            }

            await this.infractionManager.createBan({
                guildId: member.guild.id,
                user: member.user,
                reason,
                moderator: this.client.user!,
                duration: ban_duration ? Duration.fromMilliseconds(ban_duration) : undefined
            });
        }
    }
}

export default AntiMemberJoinService;
