
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

import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
    discord_id: string;
    username: string;
    guilds: Array<string>;
    password?: string;
    token?: string;
    isAdmin?: boolean;
    createdAt: Date;
    tokenUpdatedAt?: Date;
}

const schema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    discord_id: {
        type: String,
        required: true,
    },
    guilds: {
        type: Array,
        required: true,
        default: []
    },
    password: {
        type: String,
        required: false
    },
    isAdmin: {
        type: Boolean,
        required: false,
        default: false
    },
    token: {
        type: String,
        required: false
    },
    createdAt: {
        type: Date,
        required: true,
    },
    tokenUpdatedAt: {
        type: Date,
        required: false,
    }
});

export default model('User', schema);