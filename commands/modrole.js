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

        let modrole = msg.mentions.roles?.first();

        if (!modrole) {
            modrole = cm.args[0].trim();
        }
        else {
            modrole = modrole.id;
        }

        app.config.set("mod_role", modrole);

        app.config.write();

        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setDescription(`The moderator role has been updated.`)
            ]
        });
    }
};