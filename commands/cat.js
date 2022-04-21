const MessageEmbed = require("../src/MessageEmbed");
const axios = require('axios').default;

module.exports = {
    async handle(msg, cm) {
        axios.get("https://api.thecatapi.com/v1/images/search")
        .then(res => {
            if (res && res.status === 200) {
                msg.reply({
                    content: res.data[0].url
                });
            }
        })
        .catch(err => {
            msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription('Too many requests at the same time, please try again after some time.')
                ]
            });
        });
    }
};