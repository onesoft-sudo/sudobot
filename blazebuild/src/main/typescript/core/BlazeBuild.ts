export type BlazeOptions = {
    help?: boolean;
    version?: boolean;
    dryrun?: boolean;
    graph?: boolean;
};

class BlazeBuild {
    private readonly options: BlazeOptions;

    public constructor(options: BlazeOptions) {
        this.options = options;
    }

    public async execute(taskNames: string[]) {}
}

export default BlazeBuild;
