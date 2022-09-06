import DiscordClient from './Client';
import mongoose from "mongoose";

export default class Database {
    client: DiscordClient;

    constructor(client: DiscordClient) {
        this.client = client;

        mongoose.connect(process.env.MONGO_URI!)
            .then(() => console.log("Connected to MongoDB"))
            .catch(console.error);
    }
}