import Queue from "../utils/structures/Queue";

export default class SendMessageQueue extends Queue {
    async execute(data?: { [key: string]: any;[key: number]: any; } | undefined): Promise<any> {
        console.log("Queue works!");
    }
}