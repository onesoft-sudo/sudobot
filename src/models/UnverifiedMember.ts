import { Schema, model } from 'mongoose';

const schema = new Schema({
    user_id: {
        type: String,
        required: true,
    },
    guild_id: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        required: true,
        default: 'pending'
    },
    ip: {
        type: String,
        required: false,
    },
    user_agent: {
        type: String,
        required: false,
    },
    createdAt: {
        type: Date,
        required: true
    }
});

export default model('UnverifiedMember', schema);