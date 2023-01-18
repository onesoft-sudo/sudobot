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
import Counter from './Counter';

export interface IPunishment extends Document {
    user_id: string
    mod_id: string
    mod_tag: string,
    guild_id: string;
    reason?: string;
    type: string;
    numericId?: number;
    meta?: object;
    createdAt: Date;
}

const schema = new Schema({
    numericId: {
        type: Number,
        unique: true
    },
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

schema.pre('save', function(next) {
    Counter.findByIdAndUpdate({ _id: 'punishments_id' }, { $inc: { seq: 1 } }, { upsert: true, new: true }, (error, counter) => {
        if(error)
            return next(error);

        if (counter)
            this.numericId = counter.seq;

        next();
    });
});

export default model('Punishment', schema);