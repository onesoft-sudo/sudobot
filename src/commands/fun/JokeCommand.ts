import { CommandInteraction, Message, MessageEmbed } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import axios from 'axios';

export default class JokeCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    coolDown = 4000;

    constructor() {
        super('joke', 'fun', []);
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if (msg instanceof CommandInteraction) 
            await msg.deferReply();

        axios.get("https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,religious,political,racist", {
            headers: {
                'Accept': 'application/json'
            }
        })
        .then(async res => {
            if (res.data && !res.data.error) {
                await this.deferReply(msg, {
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
                await this.deferReply(msg, {
                    content: "Something went wrong with the API response. Please try again later."
                });
            }
        })
        .catch(async e => {
            console.log(e);
            await this.deferReply(msg, {
                content: "Something went wrong with the API. Please try again later."
            });
        })
    }
}