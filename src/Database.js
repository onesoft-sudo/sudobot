const { Database: DB } = require('sqlite3');

class Database {
    constructor(dbpath) {
        this.dbpath = dbpath;
        this.db = new DB(dbpath, (err) => {
            if (err) {
                console.log(err);
            }
        });
    }

    get(sql, callback1, callback2) {
        return this.db.get(sql, callback1, callback2);
    }

    all(sql, callback1, callback2) {
        return this.db.all(sql, callback1, callback2);
    }
} 

module.exports = Database;