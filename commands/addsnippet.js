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

        let args = [...cm.args];
        args.shift();
        let content = args.join(' ');

        let files = msg.attachments.map(a => {
            return {
                name: a.name,
                attachment: a.attachment,
                proxyURL: a.proxyURL,
            }
        });

        console.log(files);
        
        let status = await cm.snippetManager.create(msg.guild.id, cm.args[0], content, files);
        
        if (status) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setDescription('New snippet added successfully!')
                ]
            });
        }
        else {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription('A snippet already exists with that name.')
                ]
            });
        }
    }
};