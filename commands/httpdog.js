const MessageEmbed = require("../src/MessageEmbed");
const axios = require('axios').default;

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

        let status = parseInt(cm.args[0]);

        if (typeof status !== 'number' || status < 100 || status > 515) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription('Argument #1 must be a valid HTTP status code.')
                ]
            });

            return;
        }

        let url = "https://http.dog/" + status + '.jpg';

        axios.get(url)
        .then(async (data) => {
            await msg.reply({
                content: url
            });
        })
        .catch(async err => {
            if (err.response.status === 404) {
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription('Argument #1 must be a valid HTTP status code.')
                    ]
                });

                return;
            }

            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription('Failed to fetch data from the API.')
                ]
            });
        });
    }
};