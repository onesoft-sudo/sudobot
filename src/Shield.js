module.exports = class Shield {
    verify(msg, cm) {
        if (app.config.props[msg.guild.id].global_commands.indexOf(cm.commandName) !== -1) {
            return true;
        }

        if (!msg.member.roles.cache.has(app.config.props[msg.guild.id].mod_role)) {
            return false;
        }

        const roles = app.config.props[msg.guild.id].role_commands;

        for (let roleID in roles) {
            if (msg.member.roles.cache.has(roleID) && roles[roleID].indexOf(cm.commandName) === -1) {
                return true;
            }
        }
        
        return false;
    }
};