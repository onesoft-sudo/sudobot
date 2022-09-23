import { Schema, model } from 'mongoose';

export interface IPunishment {
    user_id: string
    mod_id: string
    mod_tag: string,
    guild_id: string;
    reason?: string;
    type: string
    meta?: object;
    createdAt: Date;
}

const schema = new Schema({
    user_id: {
        type: String,
        required: true,
    },
    mod_id: {
        type: String,
        required: true,
    },
    mod_tag: {
        type: String,
        required: true,
    },
    guild_id: {
        type: String,
        required: true,
    },
    reason: {
        type: String,
        required: false
    },
    type: {
        type: String,
        required: true
    },
    meta: {
        type: Object,
        required: true,
        default: {}
    },
    createdAt: {
        type: Date,
        required: true
    }
});

// class Punishment extends Model {}

// Punishment.init({
//     id: {
//         type: DataTypes.INTEGER,
//         primaryKey: true,
//         autoIncrement: true,
//         allowNull: false,
//     },
//     user_id: {
//         type: DataTypes.STRING,
//         allowNull: false,
//     },
//     mod_id: {
//         type: DataTypes.STRING,
//         allowNull: false,
//     },
//     mod_tag: {
//         type: DataTypes.STRING,
//         allowNull: false,
//     },
//     guild_id: {
//         type: DataTypes.STRING,
//         allowNull: false,
//     },
//     reason: {
//         type: DataTypes.TEXT,
//         allowNull: true
//     },
//     type: {
//         type: DataTypes.STRING,
//         allowNull: false
//     },
//     meta: {
//         type: DataTypes.JSON,
//         allowNull: false,
//         defaultValue: {}
//     },
// }, {
//     sequelize: DiscordClient.client.db.sequelize,
//     modelName: 'Punishment',
//     updatedAt: false,
//     tableName: 'punishments'
// });

export default model('Punishment', schema);