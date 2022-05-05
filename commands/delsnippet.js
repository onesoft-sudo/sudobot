const MessageEmbed = require("../src/MessageEmbed");

module.exports = {
    async handle(msg, cm) {
        if (cm.args[0] === undefined) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription('This command requires at least 1 argument.')
                ]
            });

            return;
        }
        
        let status = cm.snippetManager.delete(msg.guild.id, cm.args[0]);
        
        if (status) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setDescription('Snippet deleted successfully!')
                ]
            });
        }
        else {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription('No snippet was found with that name.')
                ]
            });
        }
    }
};