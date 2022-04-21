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
        
        let snippet = cm.snippetManager.find(cm.args[0]);
        
        if (snippet) {
            cm.snippetManager.delete(snippet.name);
            cm.snippetManager.create(cm.args[1], snippet.content);

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