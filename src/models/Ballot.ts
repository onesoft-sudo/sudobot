import { Schema, model } from 'mongoose';

const schema = new Schema({
    content: {
        type: String,
        required: true
    },
    author: {
        type: String,
        required: true
    },
    msg_id: {
        type: String,
        required: true
    },
    channel_id: {
        type: String,
        required: true
    },
    guild_id: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true,
    }
});

export default model('Ballot', schema);