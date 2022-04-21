const MessageEmbed = require("../src/MessageEmbed");
const axios = require('axios').default;

function url() {
    return `https://pixabay.com/api/?key=${process.env.PIXABAY_TOKEN}&safesearch=true&per_page=3`;
}

function random(arr) {
    let index = Math.floor(Math.random() * arr.length);
    return arr[index];
}

async function image(msg, cm, type) {
    let genurl = `${url()}&image_type=${type}`;

    if (cm.args[1] !== undefined) {
        let args = [...cm.args];
        args.shift();
        genurl += `&q=${args.join(' ')}`;
    }

    console.log(genurl);

    axios.get(genurl)
    .then(res => {
        if (res && res.status === 200) {
            //console.log(res.data);
            msg.reply({
                content: random(res.data.hits).largeImageURL
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

async function photo(msg, cm) {
    await image(msg, cm, 'photo');
}

async function vector(msg, cm) {
    await image(msg, cm, 'vector');
}

async function illustration(msg, cm) {
    await image(msg, cm, 'illustration');
}

module.exports = {
    async handle(msg, cm) {
        if (cm.args[0] === undefined) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription('No subcommand provided.')
                ]
            });

            return;
        }

        if (cm.args[0] === 'photo') {
            await photo(msg, cm);
        }
        else if (cm.args[0] === 'vector') {
            await vector(msg, cm);
        }
        else if (cm.args[0] === 'illustration') {
            await illustration(msg, cm);
        }
        else if (cm.args[0] === 'image') {
            await image(msg, cm, 'all');
        }
        else {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription('Invalid subcommand provided.')
                ]
            });
        }     
    }
};