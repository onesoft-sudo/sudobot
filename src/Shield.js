module.exports = class Shield {
    verify(msg, cm) {
        return app.config.props[msg.guild.id].global_commands.indexOf(cm.commandName) !== -1 || msg.member.roles.cache.has(app.config.props[msg.guild.id].mod_role);
    }
};