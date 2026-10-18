import AbstractApplication from "@framework/app/Application.js";
import type MessageBus from "@framework/bus/MessageBus.js";

class Application extends AbstractApplication {
    public override readonly bus: MessageBus = {} as MessageBus;
}

export default Application;
