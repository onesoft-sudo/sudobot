const MessageEmbed = require("../src/MessageEmbed");

module.exports = {
    async handle(msg, cm) {
        if (typeof cm.args[1] === 'undefined') {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`This command requires at least two arguments.`)
                ]
            });

            return;
        }

        const key = cm.args[0];
        const value = cm.args[1];

        if (typeof app.config.props[msg.guild.id][key] === 'undefined') {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`The configuration key \`${key}\` not found.`)
                ]
            });

            return;
        }

        await app.config.set(key, value);
        await app.config.write();

        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setColor('#007bff')
                .setDescription(`The configuration key \`${key}\` updated.`)
            ]
        });

        return;
    }
};