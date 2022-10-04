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

import mongoose, { Document } from "mongoose"

export interface IQueuedJob extends Document {
    uuid: string;
    data?: { [key: string | number]: any };
    runOn: Date;
    createdAt: Date;
    guild?: string;
}

const schema = new mongoose.Schema({
    uuid: {
        type: String,
        required: true,
        unique: true
    },
    data: mongoose.Schema.Types.Mixed,
    runOn: {
        type: Date,
        required: true
    }, 
    createdAt: {
        type: Date,
        required: true
    },
    className: {
        type: String,
        required: true
    },
    guild: String
});

export default mongoose.model('QueuedJob', schema);