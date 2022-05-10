const MessageEmbed = require('../src/MessageEmbed');
const { version } = require('./help');
const { lockAll } = require('./lockall');

module.exports = {
    async handle(msg) {
        let role = msg.guild.roles.everyone;
            let channels = msg.guild.channels.cache.filter(channel => app.config.get('raid').excluded.indexOf(channel.id) === -1 && app.config.get('raid').excluded.indexOf(channel.parent?.id) === -1 && channel.type === 'GUILD_TEXT');

            await lockAll(role, channels, true);
    }
};