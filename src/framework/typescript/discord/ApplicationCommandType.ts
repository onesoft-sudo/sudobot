export const ApplicationCommandType = {
    ChatInput: 1,
    User: 2,
    Message: 3,
    PrimaryEntryPoint: 4
} as const;

export type ApplicationCommandType =
    (typeof ApplicationCommandType)[keyof typeof ApplicationCommandType];
