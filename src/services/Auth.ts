import { GuildMember } from "discord.js";
import DiscordClient from "../client/Client";

export default class Auth {
    constructor(protected client: DiscordClient) {

    }

    async verify(member: GuildMember, command: string): Promise<boolean> {
        const cmds: string[] = await this.client.config.get('global_commands');

        if (cmds.indexOf(command) !== -1) {
            return true;
        }

        if (await member.roles.cache.has(await this.client.config.get('mod_role'))) {
            let restricted: string[] = [];
            const roleCommands: { [key: string]: string[] } = await this.client.config.get('role_commands');
            
            for (const roleID in roleCommands) {
                if (await member.roles.cache.has(roleID)) {
                    restricted = await roleCommands[roleID];
                    break;
                }
            }

            return restricted.indexOf(command) === -1;
        }

        return false;
    }
};