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

    runAsync(sql, paramsOrCallback = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, paramsOrCallback, err => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve();
            });
        });
    }

    getAsync(sql, paramsOrCallback = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, paramsOrCallback, (err, data) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(data);
            });
        });
    }

    allAsync(sql, paramsOrCallback = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, paramsOrCallback, (err, data) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(data);
            });
        });
    }
} 

module.exports = Database;