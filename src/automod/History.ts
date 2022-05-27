import { Guild } from "discord.js";
import DiscordClient from "../client/Client";

export default class History {
    static get(user_id: string | number, guild: Guild, callback?: (data: any) => void) {
        DiscordClient.client.db.all('SELECT * FROM history WHERE guild_id = ? AND user_id = ? ORDER BY id DESC', [guild.id, user_id], (err: any, data: any) => {
            if (err) {
                console.log(err);
            }

            callback !== undefined ? callback(data) : undefined;
        });
    }

    static create(user_id: string | number, guild: Guild, type: string, mod: string | number, reason: string | null, callback?: (data: any) => void) {
        DiscordClient.client.db.get('INSERT INTO history(type, user_id, guild_id, date, mod_id, reason) VALUES(?, ?, ?, ?, ?, ?)', [type, user_id, guild.id, new Date().toISOString(), mod, reason], (err: any) => {
            if (err) {
                console.log(err);
            }

            DiscordClient.client.db.get("SELECT * FROM history WHERE type = ? AND user_id = ? AND guild_id = ? ORDER BY id DESC LIMIT 0, 1", [type, user_id, guild.id], (err: any, data: any) => {
                if (err) {
                    console.log(err);
                }
                
                callback !== undefined ? callback(data) : undefined;
            });
        });
    }
};