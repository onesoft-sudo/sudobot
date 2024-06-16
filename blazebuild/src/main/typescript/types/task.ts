export type SerializedTask = {
    name: string;
    lastRun: number;
    input: string[];
    output: string[];
    pure: boolean;
};
