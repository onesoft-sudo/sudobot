import mongoose, { Document } from "mongoose"

export interface IQueuedJob extends Document {
    uuid: string;
    data?: { [key: string | number]: any };
    runOn: number;
    createdAt: Date;
}

const schema = new mongoose.Schema({
    uuid: {
        type: String,
        required: true,
        unique: true
    },
    data: mongoose.Schema.Types.Mixed,
    runOn: {
        type: Number,
        required: true
    }, 
    createdAt: {
        type: Date,
        required: true
    },
    className: {
        type: String,
        required: true
    }
});

export default mongoose.model('QueuedJob', schema);