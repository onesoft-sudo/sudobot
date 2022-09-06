import { Schema, model, SchemaTypes, Document } from 'mongoose';

const schema = new Schema({
    time: {
        type: String,
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    params: {
        type: String,
        required: true
    },
    guild_id: {
        type: String,
        required: true
    },
    cmd: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        required: true
    }
});

export default model('Timeout', schema);