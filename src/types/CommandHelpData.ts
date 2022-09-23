export type CommandHelpData = {
    name: string,
    shortBrief: string,
    description: string | null,
    structure: string,
    slashCommand: boolean,
    legacyCommand: boolean;
    example: string,
    notes: string | null,
    options?: {
        [key: string]: string;
    },
    subcommands?: {
        [key: string]: string;
    }
};