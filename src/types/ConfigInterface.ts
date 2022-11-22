// TODO

import { MessageRule } from "../automod/MessageRules";

export default interface ConfigInterface {
    prefix: string;
    debug: boolean;
    mod_role: string;
    mute_role: string;
    gen_role: string;
    announcement_channel: string;
    logging_channel: string;
    logging_channel_join_leave: string;
    admin: string;
    reports: {
        enabled: boolean,
        mod_only: boolean,
        reporters: string[],
        reporter_roles: string[]
    },
    autoclear: {
        enabled: boolean;
        channels: string[]
    },
    message_rules: {
        enabled: boolean,
        disabled_channels: string[],
        rules: MessageRule[]
    }
}