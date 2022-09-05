import { DataTypes, Model } from 'sequelize';
import DiscordClient from '../client/Client';
import { Schema, model, SchemaTypes, Document } from 'mongoose';

export interface IAFK extends Document {
    user: string;
    reason?: string;
    mentions: Array<object>;
    guild_id: string;
    createdAt: Date;
}

const schema = new Schema({
    user: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        required: false
    },
    mentions: Array,
    guild_id: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        required: true
    }
});

export default model('AFK', schema);