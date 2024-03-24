import BlazeBuild from "./BlazeBuild";

export class Plugin {
    private _cli?: BlazeBuild;

    protected get cli() {
        if (!this._cli) {
            throw new Error("CLI is not set.");
        }

        return this._cli;
    }

    public setCLI(cli: BlazeBuild) {
        this._cli = cli;
    }
}
