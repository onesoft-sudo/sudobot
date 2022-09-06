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
    content: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        required: true
    }
});

export default model('PunishmentAppeal', schema);