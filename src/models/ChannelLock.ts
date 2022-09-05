import { DataTypes, Model } from 'sequelize';
import DiscordClient from '../client/Client';
import { Schema, model, Document, SchemaTypes } from 'mongoose';

const schema = new Schema({
    reason: {
        type: String,
        required: false
    },
    user_id: {
        type: String,
        required: true
    },
    guild_id: {
        type: String,
        required: true
    },
    channel_id: {
        type: String,
        unique: true,
        required: true
    },
    role_id: {
        type: String,
        required: true
    },
    previous_perms: {
        allow: Array,
        deny: Array
    },
    createdAt: {
        type: Date,
        required: true
    }
});

export default model('ChannelLock', schema);