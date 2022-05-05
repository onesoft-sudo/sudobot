const MessageEmbed = require("../src/MessageEmbed");

module.exports = {
    async handle(msg, cm) {
        if (cm.args[1] === undefined) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription('This command requires at least 2 arguments.')
                ]
            });

            return;
        }
        
        let snippet = cm.snippetManager.find(msg.guild.id, cm.args[0]);
        
        if (snippet) {
            cm.snippetManager.delete(msg.guild.id, snippet.name);
            cm.snippetManager.create(msg.guild.id, cm.args[1], snippet.content);

            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setDescription('Snippet renamed successfully!')
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