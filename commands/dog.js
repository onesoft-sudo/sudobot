const MessageEmbed = require("../src/MessageEmbed");
const axios = require('axios').default;

module.exports = {
    async handle(msg, cm) {
        axios.get("https://dog.ceo/api/breeds/image/random")
        .then(res => {
            if (res && res.status === 200 && res.data.status === 'success') {
                msg.reply({
                    content: res.data.message
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