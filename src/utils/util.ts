import fs from 'fs';
import DiscordClient from '../client/Client';
import { GuildMember, Message, CommandInteraction, MessageEmbed, ContextMenuInteraction, Interaction } from 'discord.js';
import Axios, { AxiosRequestHeaders, HeadersDefaults } from 'axios';
import { formatDistanceToNowStrict, formatDuration, intervalToDuration } from 'date-fns';
import { Snippet } from '../services/SnippetManager';

export function parseEmbedsInString(content: string) {
    const embedExpressions = content.matchAll(/embed\:(\{[^\n]+\})/g);
    const newContent = content.replace(/embed\:(\{[^\n]+\})/g, '');
    let embeds: MessageEmbed[] = [];

    for (const expr of [...embedExpressions]) {
        const parsed = JSON.parse(expr[1]);

        try {
            embeds.push(new MessageEmbed(parsed).setColor(parsed.color));     
        }
        catch (e) {
            console.log(e);
        }
    }

    return { embeds, content: newContent };
}

export function splitMessage(message: string, limit: number = 1000, maxIterationCount: number = 100) {
    const splitted: string[] = [];
    let content = message;
    let { length } = content;

    if (length >= limit) {
        let i = 0;

        while (length !== 0 && content !== '') {
            splitted.push(content.substring(0, limit));
            content = content.substring(limit);
            length = content.length;
            i++;

            if (i >= maxIterationCount) {
                console.log('Break loop');
                break;
            }
        }
    }
    else {
        splitted.push(message);
    }

    return splitted;
}

export function getHomeGuild(client: DiscordClient) {
    return client.guilds.cache.get(client.config.props.global.id);
}

export function shouldNotModerate(client: DiscordClient, member: GuildMember) {
	if (!client.config.props[member.guild.id].admin) {
		return false;
	}

	const role = client.config.props[member.guild.id].admin;

	return role && role.trim() !== '' && member.roles.cache.has(role);
}

export async function hasPermission(client: DiscordClient, member: GuildMember, msg: Message | CommandInteraction | ContextMenuInteraction, mod: GuildMember | null, error: string = "You don't have permission to moderate this user") {
	let m = mod;
	
	if (!m) {
		m = msg.member! as GuildMember;
	}
	
	if (member.id !== m.id && member.roles.highest?.position >= m.roles.highest?.position) {
        if (msg instanceof Interaction && msg.deferred) {
            await msg.editReply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`:x: ${error}`)
                ]
            });

            return false;
        }

		await msg.reply({
			embeds: [
				new MessageEmbed()
				.setColor('#f14a60')
				.setDescription(`:x: ${error}`)
			]
		});

		return false;
	}

	return true;
}

export function timeProcess(seconds: number) {
	return formatDuration(intervalToDuration({ start: 0, end: seconds * 1000 }));
}


/**
 * @deprecated
 */
export function timeProcessOld(seconds: number) {      
    let interval = seconds / (60 * 60 * 24 * 30 * 365);

    if (interval >= 1) {
        return Math.floor(interval) + " year" + (Math.floor(interval) === 1 ? '' : 's');
    }

    interval = seconds / (60 * 60 * 24 * 30);

    if (interval >= 1) {
        return Math.floor(interval) + " month" + (Math.floor(interval) === 1 ? '' : 's');
    }

    interval = seconds / (60 * 60 * 24);

    if (interval >= 1) {
        return Math.floor(interval) + " day" + (Math.floor(interval) === 1 ? '' : 's');
    }

    interval = seconds / (60 * 60);

    if (interval >= 1) {
        return Math.floor(interval) + " hour" + (Math.floor(interval) === 1 ? '' : 's');
    }

    interval = seconds / 60;

    if (interval >= 1) {
        return Math.floor(interval) + " minute" + (Math.floor(interval) === 1 ? '' : 's');
    }

    interval = seconds;

    return Math.floor(interval) + " second" + (Math.floor(interval) === 1 ? '' : 's');
}

export function escapeRegex(string: string) {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

export function timeSince(date: number) {
    // const seconds = Math.floor((Date.now() - date) / 1000);
    // return timeProcess(seconds) + ' ago';
    return formatDistanceToNowStrict(new Date(date), { addSuffix: true });
}

export async function download(url: string, path: string, headers?: AxiosRequestHeaders) {  
    const writer = fs.createWriteStream(path);
    
    const response = await Axios({
        url,
        method: 'GET',
        responseType: 'stream',
        headers
    });
    
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
        if (response.status !== 200) {
            reject();
        }

        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

export async function deleteFile(path: string) {
    fs.rm(path, (err: any) => {
        if (err) {
            throw new Error(err);
        }
    });
}

export function random(arr: Array <any>) {
    let index = Math.floor(Math.random() * arr.length);
    return arr[index];
}

export function fill(length: number, string: string, token: string = ' ') {
    let safe = 0;

    if (length < string.length)
        return string;

    const diff = length - string.length;

    for (let i = 1; i <= diff; i++, safe++) {
        if (safe >= 500)
            break;        

        string += ' ';
    }   

    return string;
}

export function green(string: string) {
    return '\u001b[1;32m' + string + '\u001b[0m';
}

export function yellow(string: string) {
    return '\u001b[1;33m' + string + '\u001b[0m';
}

export function red(string: string) {
    return '\u001b[1;31m' + string + '\u001b[0m';
}
