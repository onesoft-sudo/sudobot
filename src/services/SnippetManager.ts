import { APIEmbed } from "discord-api-types/v9";
import { MessageEmbedOptions } from "discord.js";
import { readFile, writeFile } from "fs";
import path from "path";
import DiscordClient from "../client/Client";
import MessageEmbed from "../client/MessageEmbed";
import Service from "../utils/structures/Service";
import { deleteFile, parseEmbedsInString } from "../utils/util";

export type Snippet = {
    name: string;
    content: string;
    files: string[],
    embeds?: MessageEmbed[]
}; 

export type SnippetContainer = {
    [guildID: string]: Snippet[];
}; 

export default class SnippetManager extends Service {
    snippets: SnippetContainer = {};

    constructor(client: DiscordClient) {
        super(client);
        this.load();
    }

    load() {
        readFile(path.resolve(__dirname, '../..', 'config/snippets.json'), (err, data) => {
            if (err) {
                console.log(err);                
            }

            this.snippets = JSON.parse(data.toString());
        });
    }

    write() {
        writeFile(path.resolve(__dirname, '../..', 'config/snippets.json'), JSON.stringify(this.snippets), () => null);
    }

    set(guildID: string, name: string, content: string, files: string[] = []): void {
        this.snippets[guildID].push({
            name,
            content,
            files
        });
    }

    get(guildID: string, name: string): Snippet | null {
        if (!this.snippets[guildID]) {
            return null;
        }
        
        for (const s of this.snippets[guildID]) {
            if (s.name === name) {
                return s;
            }
        }

        return null;
    }
    
    getParsed(guildID: string, name: string): Snippet | null {
        const snippet = this.get(guildID, name);

        if (!snippet) {
            return null;
        }

        return this.parseEmbeds(snippet) ?? snippet;
    }

    parseEmbeds(snippet: Snippet) {        
        try {
            const { embeds, content } = parseEmbedsInString(snippet.content);

            console.log(content);            

            return <Snippet> {
                ...snippet,
                content,
                embeds,
            };
        }
        catch (e) {
            console.log(e);
        }
    }

    async delete(guildID: string, name: string): Promise<void> {
        for (const i in this.snippets[guildID]) {
            if (this.snippets[guildID][i].name === name) {
                for await (const file of this.snippets[guildID][i].files) {
                    try {
                        await deleteFile(path.resolve(__dirname, '../../storage', file));
                    }
                    catch (e) {
                        console.log(e);                
                    }
                }

                await this.snippets[guildID].splice(parseInt(i), 1);

                return;
            }
        }
    }

    async deleteData(guildID: string, name: string): Promise<void> {
        for (const i in this.snippets[guildID]) {
            if (this.snippets[guildID][i].name === name) {
                await this.snippets[guildID].splice(parseInt(i), 1);
                return;
            }
        }
    }
}
