import { roleMention } from "@discordjs/builders";
import { ButtonInteraction, GuildMember } from "discord.js";
import InteractionRole from "../models/InteractionRole";
import Service from "../utils/structures/Service";

export default class InteractionRoleManager extends Service {
    async onButtonInteraction(interaction: ButtonInteraction) {
        if (!interaction.customId.startsWith('role__')) {
            console.log("Not a interaction role button!");
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        const [, id, roleID] = interaction.customId.split('__');
        const interactionRole = await InteractionRole.findOne({
            _id: id,
            role_id: roleID,
            guild_id: interaction.guildId!,
            type: "button"
        });

        if (!interactionRole) {
            await interaction.editReply({ content: "Uh oh! Looks like a server-side error has occured (could not find role info in database), please contact the developer/maintainer of the bot." });
            return;
        }

        try {
            const role = await interaction.guild!.roles.fetch(roleID);

            if (!role) {
                throw new Error();
            }

            try {
                const member = interaction.member as GuildMember;

                if (!member.roles.cache.has(role.id)) {
                    await member.roles.add(role);
                    await interaction.editReply({ content: `Gave you the ${roleMention(role.id)} role.` });
                }
                else {
                    await member.roles.remove(role);
                    await interaction.editReply({ content: `Removed the ${roleMention(role.id)} role from you.` });
                }
            }
            catch (e) {
                await interaction.editReply({ content: "An error occurred while trying to give/take-out the role." });
                return;
            }
        }
        catch (e) {
            await interaction.editReply({ content: "Could not find the role, contact the server administrators." });
            return;
        }
    }
}