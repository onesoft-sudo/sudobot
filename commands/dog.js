const MessageEmbed = require("../src/MessageEmbed");
const axios = require('axios').default;
const path = require('path');
const { download, delete: deleteFile } = require("./cat");

/*
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
*/

module.exports = {
    async handle(msg, cm) {
        axios.get("https://api.thedogapi.com/v1/images/search", {
            headers: {
                "x-api-key": process.env.DOG_API_TOKEN
            }
        })
        .then(res => {        
            if (res && res.status === 200) {
                let name = res.data[0].url;
                const pos = name.indexOf('?');

                if (pos !== -1) {
                    name = name.substring(0, pos);
                }

                name = name.split(/\/+/);
                name = name[name.length - 1];

                console.log(name);
                const filename = path.join(__dirname, '..', 'tmp', name);

                if (filename.endsWith('.false')) {
                    filename = filename.replace(/\.false$/, '.png');
                }

                download(res.data[0].url, filename)
                .then(() => {
                    msg.reply({
                        files: [
                            {
                                attachment: filename,
                                name
                            }
                        ]
                    });

                    deleteFile(filename);
                })
                .catch(err => {
                    console.log("DL error: " + err.message);

                    deleteFile(filename);

                    msg.reply({
                        embeds: [
                            new MessageEmbed()
                            .setColor('#f14a60')
                            .setDescription('Internal API error occured (download-time error), please try again.')
                        ]
                    });
                });
            }
            else if (res?.status === 429) {
                msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription('Too many requests at the same time, please try again after some time.')
                    ]
                });
            }
            else {
                msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription('Internal API error occured (pre-download time error), please try again.')
                    ]
                });
            }
        })
        .catch(err => {
            console.log(err);

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