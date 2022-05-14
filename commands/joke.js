const { default: axios } = require("axios");
const { MessageEmbed } = require("discord.js");

module.exports = {
    async handle(msg, cm) {
        axios.get("https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,religious,political,racist", {
            headers: {
                'Accept': 'application/json'
            }
        })
        .then(async res => {
            if (res.data && !res.data.error) {
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#007bff')
                        .setTitle('Joke')
                        .setDescription(res.data.type === 'twopart' ? res.data.setup + '\n\n' + res.data.delivery : res.data.joke)
                        .addField('Category', res.data.category)
                        .setFooter({
                            text: `ID: ${res.data.id}`
                        })
                    ]
                });
            }
            else {
                await msg.reply({
                    content: "Something went wrong with the API response. Please try again later."
                });
            }
        })
        .catch(async e => {
            console.log(e);
            await msg.reply({
                content: "Something went wrong with the API. Please try again later."
            });
        })
    }
};