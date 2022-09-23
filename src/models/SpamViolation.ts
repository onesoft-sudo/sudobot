import { Schema, model } from 'mongoose';

export interface ISpamViolation {
    user_id: string;
    guild_id: string;
    strike?: number;
    createdAt: Date;
}

const schema = new Schema({
    user_id: {
        type: String,
        required: true
    },
    guild_id: {
        type: String,
        required: true
    },
    strike: {
        type: Number,
        required: true,
        default: 1
    },
    createdAt: {
        type: Date,
        required: true
    }
});

export default model('SpamViolation', schema);