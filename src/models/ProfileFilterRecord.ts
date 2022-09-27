import mongoose, { Document } from "mongoose";

export interface IProfileFilterRecord extends Document {
    user: string;
    guild: string;
    action: string;
    createdAt: Date;
}

const schema = new mongoose.Schema({
    user: {
        type: String,
        required: true
    },
    guild: {
        type: String,
        required: true
    },
    action: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        required: true
    }
});

export default mongoose.model('ProfileFilterRecord', schema);