const MessageEmbed = require("../src/MessageEmbed");
const Axios = require('axios');
const { default: axios } = Axios;
const fs = require('fs');
const { Attachment } = require('discord.js');
const path = require("path");

module.exports = {
    async download(url, path) {  
        const writer = fs.createWriteStream(path);
        
        const response = await Axios({
            url,
            method: 'GET',
            responseType: 'stream',
            headers: {
                "x-api-key": process.env.CAT_API_TOKEN
            }
        });
        
        response.data.pipe(writer);

        if (response.status !== 200) {
            reject();
        }
        
        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    },
    async delete(path) {
        fs.rm(path, err => {
            if (err) {
                throw new Error(err);
            }
        });
    },
    async handle(msg, cm) {
        axios.get("https://api.thecatapi.com/v1/images/search", {
            headers: {
                "x-api-key": process.env.CAT_API_TOKEN
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

                this.download(res.data[0].url, filename)
                .then(() => {
                    msg.reply({
                        files: [
                            {
                                attachment: filename,
                                name
                            }
                        ]
                    });

                    this.delete(filename);
                })
                .catch(err => {
                    console.log("DL error: " + err.message);

                    this.delete(filename);

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