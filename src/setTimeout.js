const path = require('path');
const timeouts = new Map();

const runTimeouts = async () => {
    const data = await app.db.allAsync("SELECT * FROM timeouts");

    // await console.log(data);

    if (data && data.length > 0) {
        console.log('Running timeouts...');
        for await (const row of data) {
            // console.log(row)

            let timeout = await setTimeout(async () => {
                await console.log('TIMEOUT');
                await app.db.runAsync("DELETE FROM timeouts WHERE id = ?", [row.id]);
                await timeouts.delete(row.id);
                await require(row.filePath)(...JSON.parse(row.params));
            }, new Date(row.time).getTime() - Date.now());

            await timeouts.set(row.id, {
                row,
                timeout
            });
        }
    }
};

const setTimeoutv2 = async (file, time, guild_id, cmd, ...params) => {
    await console.log('SETTING');
    await app.db.allAsync("INSERT INTO timeouts(created_at, filePath, time, params, guild_id, cmd) VALUES(?, ?, ?, ?, ?, ?)", [new Date().toISOString(), path.resolve(__dirname, '../queues', file), new Date(Date.now() + time).toISOString(), JSON.stringify(params), guild_id, cmd]);
    const row = await app.db.getAsync('SELECT * FROM timeouts ORDER BY id DESC LIMIT 0, 1');

    const timeout = await setTimeout(async () => {
        await console.log('TIMEOUT_SET');
        await app.db.runAsync("DELETE FROM timeouts WHERE id = ?", [row.id]);
        await timeouts.delete(row.id);
        await require(path.resolve(__dirname, '../queues', file))(...params);
    }, time);
    
    const data = {
        row,
        timeout
    };

    await timeouts.set(row.id, data);
    return data;
};

const clearTimeoutv2 = async ({ row, timeout }) => {
    await clearTimeout(timeout);
    await app.db.runAsync("DELETE FROM timeouts WHERE id = ?", [row.id]);
    await timeouts.delete(row.id);
}; 

const getTimeout = id => timeouts.get(id);

const hasTimeout = id => timeouts.has(id);

const getTimeouts = () => timeouts;

module.exports = { runTimeouts, setTimeoutv2, clearTimeoutv2, getTimeout, hasTimeout, getTimeouts };