const MessageEmbed = require("../src/MessageEmbed");
const { escapeRegex } = require("../src/util");

module.exports = {
    async handle(msg, cm) {
        if (typeof cm.args[0] === 'undefined') {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`This command requires at least one argument.`)
                ]
            });

            return;
        }

        let general_role = msg.mentions.roles?.first();

        if (!general_role) {
            general_role = cm.args[0].trim();
        }

        app.config.set("gen_role", general_role.id);
        app.config.write();

        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setDescription(`The role has been updated.`)
            ]
        });
    }
};