import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { HasEventListeners } from "@framework/types/HasEventListeners";
import WizardManager from "@framework/widgets/WizardManager";
import { Interaction } from "discord.js";

@Name("wizardManagerService")
class WizardManagerService extends Service implements HasEventListeners {
    public readonly manager: WizardManager = new WizardManager(this.application);

    public onInteractionCreate(interaction: Interaction) {
        if (interaction.isButton() && interaction.customId.startsWith("w::")) {
            const [, id] = interaction.customId.split("::");
            const wizard = this.manager.get(id);

            if (wizard) {
                wizard
                    .dispatch(interaction, interaction.customId)
                    .catch(this.application.logger.error);
            }
        }
    }
}

export default WizardManagerService;
