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