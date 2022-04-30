const MessageEmbed = require("../src/MessageEmbed");
const { escapeRegex } = require("../src/util");

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

        const conf = app.config.get('spam_filter');

        if (typeof conf[cm.args[0]] === 'undefined' && cm.args[0] !== 'include') {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`Invalid attribute given.`)
                ]
            });

            return;
        }
        else if(cm.args[0] === 'exclude') {
            conf.exclude.push(cm.args[1]);
        }
        else if(cm.args[0] === 'include') {
            const index = conf.exclude.indexOf(cm.args[1]);

            if (index >= 0) {
                conf.exclude.splice(index, 1);
            }
        }
        else {
            conf[cm.args[0]] = cm.args[1];
        }

        app.config.set('spam_filter', conf);
        app.config.write();

        await msg.react('✅');
    }
};