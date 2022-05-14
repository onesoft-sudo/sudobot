const MessageEmbed = require('../src/MessageEmbed');
const { getTimeouts } = require('../src/setTimeout');
const { timeSince, timeProcess } = require('../src/util');

module.exports = {
    async handle(msg) {
        const map = await getTimeouts();
        let str = '';

        await map.forEach(value => {
            if (value.row.guild_id !== msg.guild.id)
                return;
            
            console.log(new Date(value.row.time).getTime() - new Date().getTime());
            str += `**${value.row.id}**\n**User Command**: \`${value.row.cmd}\`\n**Internal Command**: \`${value.row.params}\`\n**ETA**: ${timeProcess((new Date(value.row.time).getTime() - new Date().getTime()) / 1000).replace(' ago', '')}\n**Queue Added**: ${new Date(value.row.created_at).toLocaleString()} (${timeSince(new Date(value.row.created_at).getTime())})\n\n`;
        });

        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setTitle('Queue List')
                .setDescription(str === '' ? 'No queue.' : str)
                .setTimestamp()
            ]
        });
    }
};