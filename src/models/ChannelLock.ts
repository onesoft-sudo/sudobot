import { DataTypes, Model } from 'sequelize';
import DiscordClient from '../client/Client';
import { Schema, model, Document, SchemaTypes } from 'mongoose';

// export interface IChannelLock extends Document {
//     user: string;
//     reason?: string;
//     mentions: Array<object>;
//     guild_id: string;
//     createdAt: Date;
// }

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

// class ChannelLock extends Model {}

// ChannelLock.init({
//     id: {
//         type: DataTypes.INTEGER,
//         autoIncrement: true,
//         primaryKey: true,
//     },
//     reason: {
//         type: DataTypes.TEXT,
//         allowNull: true
//     },
//     user_id: {
//         type: DataTypes.STRING,
//         allowNull: false
//     },
//     guild_id: {
//         type: DataTypes.STRING,
//         allowNull: false
//     },
//     channel_id: {
//         type: DataTypes.STRING,
//         unique: true,
//         allowNull: false
//     },
//     role_id: {
//         type: DataTypes.STRING,
//         allowNull: false
//     },
//     previous_perms: {
//         type: DataTypes.JSON,
//         allowNull: false
//     }
// }, {
//     sequelize: DiscordClient.client.db.sequelize,
//     modelName: 'ChannelLock',
//     updatedAt: false,
//     tableName: 'channel_lock'
// });

export default model('ChannelLock', schema);