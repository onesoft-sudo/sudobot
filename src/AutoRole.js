module.exports = async (member, guild) => {
    const config = app.config.props[guild.id].autorole;

    if (config.enabled) {
        for await (const roleID of config.roles) {
            try {
                const role = await guild.roles.fetch(roleID);

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