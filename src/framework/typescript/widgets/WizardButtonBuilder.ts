import { ButtonBuilder } from "discord.js";

class WizardButtonBuilder extends ButtonBuilder {
    private _customId?: string;
    private _handler?: string;

    public override setCustomId(customId: string): this {
        this._customId = customId;
        return super.setCustomId(customId);
    }

    public get customId(): string {
        return this._customId!;
    }

    public setHandler(handler: string): this {
        this._handler = handler;
        return this;
    }

    public get handler(): string {
        return this._handler!;
    }
}

export default WizardButtonBuilder;
