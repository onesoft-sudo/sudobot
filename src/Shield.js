module.exports = class Shield {
    verify(msg, cm) {
        if (app.config.props[msg.guild.id].global_commands.indexOf(cm.commandName) !== -1) {
            return true;
        }

        if (!msg.member.roles.cache.has(app.config.props[msg.guild.id].mod_role)) {
          //console.log('mod-role not found: ' + msg.author.tag);  
          return false;
        }

        const roles = app.config.props[msg.guild.id].role_commands;

        for (let roleID in roles) {
           // console.log(roleID + ' search');  
            if (msg.member.roles.cache.has(roleID)) {
              if (roles[roleID].indexOf(cm.commandName) === -1) {
                return true;
              }
              else {
                return false;
              }   
            }
        }
        
        return false;
    }
};