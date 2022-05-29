import path from "path";
import DiscordClient from "../client/Client";
import Timeout from "../models/Timeout";

const timeouts = new Map();

export const runTimeouts = async () => {
    const data = (await Timeout.findAll());

    // await console.log(data);

    if (data && data.length > 0) {
        console.log('Running timeouts...');
        for await (const row of data) {
            // console.log(row)

            let timeout = await setTimeout(async () => {
                await console.log('TIMEOUT');
                await DiscordClient.client.db.runAsync("DELETE FROM timeouts WHERE id = ?", [row.get('id')]);
                await timeouts.delete(row.get('id'));
                (await import(row.get('filePath') as string)).default(DiscordClient.client, ...JSON.parse(row.get('params') as string));
            }, new Date(row.get('time') as string).getTime() - Date.now());

            await timeouts.set(row.get('id'), {
                row,
                timeout
            });
        }
    }
};

export const setTimeoutv2 = async (file: string, time: number, guild_id: string, cmd: string, ...params: any[]) => {
    await console.log('SETTING');
    await DiscordClient.client.db.allAsync("INSERT INTO timeouts(created_at, filePath, time, params, guild_id, cmd) VALUES(?, ?, ?, ?, ?, ?)", [new Date().toISOString(), path.resolve(__dirname, '../queues', file), new Date(Date.now() + time).toISOString(), JSON.stringify(params), guild_id, cmd]);
    const row = await DiscordClient.client.db.getAsync('SELECT * FROM timeouts ORDER BY id DESC LIMIT 0, 1');

    const timeout = await setTimeout(async () => {
        await console.log('TIMEOUT_SET');
        await DiscordClient.client.db.runAsync("DELETE FROM timeouts WHERE id = ?", [row.id]);
        await timeouts.delete(row.id);      
        (await import(path.resolve(__dirname, '../queues', file))).default(DiscordClient.client, ...params);
    }, time);
    
    const data = {
        row,
        timeout
    };

    await timeouts.set(row.id, data);
    return data;
};

export const clearTimeoutv2 = async ({ row, timeout }: any) => {
    await clearTimeout(timeout);
    await DiscordClient.client.db.runAsync("DELETE FROM timeouts WHERE id = ?", [row.id]);
    await timeouts.delete(row.id);
}; 

export const getTimeout = (id: string | number) => timeouts.get(id);

export const hasTimeout = (id: string | number) => timeouts.has(id);

export const getTimeouts = () => timeouts;