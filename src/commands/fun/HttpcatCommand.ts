import { CommandInteraction, Message, MessageEmbed } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import axios from 'axios';

export default class HttpcatCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    coolDown = 4000;

    constructor() {
        super('httpcat', 'fun', []);
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if (!options.isInteraction && options.args[0] === undefined) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription('This command requires at least 1 argument.')
                ]
            });

            return;
        }

        if (msg instanceof CommandInteraction) 
            await msg.deferReply();

        let status = parseInt((options.isInteraction ? options.options.getInteger('status') : options.args[0]) + '');

        if (typeof status !== 'number' || status < 100 || status > 515) {
            await this.deferReply(msg, {
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription('Argument #1 must be a valid HTTP status code.')
                ]
            });

            return;
        }

        let url = "https://http.cat/" + status;

        axios.get(url)
        .then(async (data) => {
            await this.deferReply(msg, {
                content: url
            });
        })
        .catch(async err => {
            if (err.response.status === 404) {
                await this.deferReply(msg, {
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription('Argument #1 must be a valid HTTP status code.')
                    ]
                });

                return;
            }

            await this.deferReply(msg, {
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription('Failed to fetch data from the API.')
                ]
            });
        });
    }
}