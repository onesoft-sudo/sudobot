export default interface CommandOptions {
    args: Array<string>;
    argv: Array<string>;
    normalArgs: Array<string>;
    options: Array<string>;
    cmdName: string;
    isInteraction: false;
};