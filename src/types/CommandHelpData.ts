export type CommandHelpData = {
    name: string,
    shortBrief: string,
    description: string | null,
    structure: string,
    example: string,
    notes: string | null,
    options?: {
        [key: string]: string;
    }
};