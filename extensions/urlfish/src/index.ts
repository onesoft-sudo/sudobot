import "module-alias/register";

import { Extension } from "@sudobot/core/Extension";
import { Schema } from "./types/config";

export default class URLFish extends Extension {
    public override guildConfig() {
        return {
            urlfish: Schema
        };
    }
}
