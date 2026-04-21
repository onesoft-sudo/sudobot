import type MessageBus from "@framework/bus/MessageBus";
import AbstractApplication from "@main/core/Application";

class Application extends AbstractApplication {
    public override readonly bus: MessageBus = {} as MessageBus;
}

export default Application;
