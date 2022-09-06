import DiscordClient from './Client';
import mongoose from "mongoose";

export default class Database {
    client: DiscordClient;
    dbpath: string;

    constructor(dbpath: string, client: DiscordClient) {
        this.client = client;
        this.dbpath = dbpath;

        mongoose.connect(process.env.MONGO_URI!)
            .then(() => console.log("Connected to MongoDB"))
            .catch(console.error);
    }
}