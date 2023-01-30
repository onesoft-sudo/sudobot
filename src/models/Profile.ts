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

export interface IProfile extends Document {
    user_id: string;
    gender?: string;
    pronoun?: string;
    hobbies?: string;
    bio?: string;
    age?: number;
    continent?: string;
    job?: string;
    zodiac?: string;
    languages?: string;
    subjects?: string;
    guild_id: string;
    createdAt: Date;
    updatedAt: Date;
}

const schema = new Schema({
    user_id: {
        type: String,
        required: true
    },
    gender: String,
    pronoun: String,
    age: Number,
    bio: String,
    hobbies: String,
    continent: String,
    job: String,
    zodiac: String,
    guild_id: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        required: true,
        default: () => new Date()
    },
    updatedAt: {
        type: Date,
        required: true,
        default: () => new Date()
    }
});

export default model('Profile', schema);