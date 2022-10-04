/**
* This file is part of SudoBot.
* 
* Copyright (C) 2021-2022 OSN Inc.
*
* SudoBot is free software; you can redistribute it and/or modify it
* under the terms of the GNU Affero General Public License as published by 
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* SudoBot is distributed in the hope that it will be useful, but
* WITHOUT ANY WARRANTY; without even the implied warranty of 
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the 
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License 
* along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
*/

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
        required: true,
        default: () => new Date()
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