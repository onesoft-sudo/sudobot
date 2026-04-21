import type MessageBus from "@framework/bus/MessageBus";
import AbstractApplication from "@framework/app/Application";

class Application extends AbstractApplication {
    public override readonly bus: MessageBus = {} as MessageBus;
}

export default Application;
