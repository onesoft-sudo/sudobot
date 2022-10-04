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