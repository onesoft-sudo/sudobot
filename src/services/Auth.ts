import { GuildMember } from "discord.js";
import BaseCommand from "../utils/structures/BaseCommand";
import Service from "../utils/structures/Service";

export default class Auth extends Service {
    async verify(member: GuildMember, command: BaseCommand): Promise<boolean> {
        if (command.ownerOnly && !this.client.config.props.global.owners.includes(member.user.id)) {
            return false;
        }

        const cmds: string[] = await this.client.config.get('global_commands');

        if (cmds.indexOf(command.getName()) !== -1) {
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

            return restricted.indexOf(command.getName()) === -1;
        }

        return false;
    }
};