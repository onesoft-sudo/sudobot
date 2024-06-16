import { Inject } from "@framework/container/Inject";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import type ExtensionManager from "@main/services/ExtensionManager";

@Name("extensionPostBootManager")
class ExtensionPostBootManager extends Service {
    @Inject("extensionManager")
    private readonly extensionManager!: ExtensionManager;

    public override async boot(): Promise<void> {
        return void (await this.extensionManager.postConstruct());
    }
}

export default ExtensionPostBootManager;
