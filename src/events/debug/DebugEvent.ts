import BaseEvent from "../../utils/structures/BaseEvent";

export default class DebugEvent extends BaseEvent {
    constructor() {
        super("debug");
    }

    async run(e: any): Promise <void> {
       console.log("DEBUG: ", e);
    }
}
