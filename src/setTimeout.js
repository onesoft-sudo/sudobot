const path = require('path');

const runTimeouts = async () => {
    const data = await app.db.allAsync("SELECT * FROM timeouts");

    // await console.log(data);

    if (data && data.length > 0) {
        for await (const row of data) {
            // console.log(row);

            await setTimeout(async () => {
                await console.log('TIMEOUT');
                await app.db.runAsync("DELETE FROM timeouts WHERE id = ?", [row.id]);
                await require(row.filePath)(...JSON.parse(row.params));
            }, new Date(row.time).getTime() - Date.now());
        }
    }
};

const setTimeoutv2 = async (file, time, ...params) => {
    await console.log('SETTING');
    await app.db.allAsync("INSERT INTO timeouts(created_at, filePath, time, params) VALUES(?, ?, ?, ?)", [new Date().toISOString(), path.resolve(__dirname, '../queues', file), new Date(Date.now() + time).toISOString(), JSON.stringify(params)]);
    const id = (await app.db.getAsync('SELECT * FROM timeouts ORDER BY id DESC LIMIT 0, 1'))?.id;

    await setTimeout(async () => {
        await console.log('TIMEOUT_SET');
        await app.db.runAsync("DELETE FROM timeouts WHERE id = ?", [id]);
        await require(path.resolve(__dirname, '../queues', file))(...params);
    }, time);
};

module.exports = { runTimeouts, setTimeoutv2 };