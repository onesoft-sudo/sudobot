import { HasApplication } from "@framework/types/HasApplication";
import type Wizard from "@framework/widgets/Wizard";

class WizardManager extends HasApplication {
    private readonly wizards: Map<string, Wizard> = new Map();

    public register(name: string, wizard: Wizard): void {
        this.wizards.set(name, wizard);
    }

    public get(name: string): Wizard | undefined {
        return this.wizards.get(name);
    }

    public dispose(name: string): void {
        this.wizards.delete(name);
    }
}

export default WizardManager;
