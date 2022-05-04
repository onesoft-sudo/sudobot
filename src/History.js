module.exports = class History {
    static get(user_id, guild, callback) {
        app.db.all('SELECT * FROM history WHERE guild_id = ? AND user_id = ?', [guild.id, user_id], (err, data) => {
            if (err) {
                console.log(err);
            }

            callback(data);
        });
    }

    static create(user_id, guild, type, mod, callback) {
        app.db.get('INSERT INTO history(type, user_id, guild_id, date, mod_id) VALUES(?, ?, ?, ?, ?)', [type, user_id, guild.id, new Date().toISOString(), mod], (err) => {
            if (err) {
                console.log(err);
            }

            app.db.get("SELECT * FROM history WHERE type = ? AND user_id = ? AND guild_id = ? ORDER BY id DESC LIMIT 0, 1", [type, user_id, guild.id], (err, data) => {
                if (err) {
                    console.log(err);
                }
                
                callback(data);
            });
        });
    }
};