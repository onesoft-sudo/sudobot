import { Sequelize } from 'sequelize';
import { Database as DB } from 'sqlite3';
import DiscordClient from './Client';

export default class Database {
    client: DiscordClient;
    dbpath: string;
    db: DB;
    sequelize: Sequelize;

    constructor(dbpath: string, client: DiscordClient) {
        this.client = client;
        this.dbpath = dbpath;

        this.sequelize = new Sequelize({
            dialect: 'sqlite',
            storage: dbpath
        });

        this.db = new DB(dbpath, (err) => {
            if (err) {
                console.log(err);
            }
        });
    }

    get(sql: string, params: any[] | Function, callback?: Function) {
        return this.db.get(sql, params, callback);
    }

    all(sql: string, params: any[] | Function, callback?: Function) {
        return this.db.all(sql, params, callback);
    }

    runAsync(sql: string, paramsOrCallback: any[] | Function = []) {
        return new Promise<void>((resolve, reject) => {
            this.db.run(sql, paramsOrCallback, err => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve();
            });
        });
    }

    getAsync(sql: string, paramsOrCallback: any[] | Function = []): Promise <any> {
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

    allAsync(sql: string, paramsOrCallback: any[] | Function = []): Promise <any> {
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

    get s(): Sequelize {
        return this.sequelize;
    }
};