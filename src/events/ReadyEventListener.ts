import EventListener from "../components/events/EventListener";
import { Events } from "../components/utils/ClientEvents";

class ReadyEventListener extends EventListener<Events.Ready> {
    public override readonly name = Events.Ready;

    public override async execute() {
        this.client.logger.info(`Logged in as: ${this.client.user?.username}`);
    }
}

export default ReadyEventListener;
