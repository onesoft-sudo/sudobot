import { Guild, GuildMember } from "discord.js";
import DiscordClient from "../client/Client";

export default async function autoRole(client: DiscordClient, member: GuildMember) {
    const config = client.config.props[member.guild!.id].autorole;

    if (config.enabled) {
        for await (const roleID of config.roles) {
            try {
                const role = await member.guild.roles.fetch(roleID);

                if (role) {
                    await member.roles.add(role);
                }
            }
            catch (e) {
                console.log(e);
            }
        }
    }
};