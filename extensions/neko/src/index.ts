import { Extension } from "@sudobot/extensions/Extension";
import { Awaitable } from "discord.js";
import "module-alias/register";
import Application from "../../../build/out/framework/typescript/app/Application";
import { Command } from "../../../build/out/framework/typescript/commands/Command";
import { Class } from "../../../build/out/framework/typescript/types/Utils";
import NekoCommand from "./commands/NekoCommand";

export default class Neko extends Extension {
    protected commands(): Awaitable<Class<Command, [Application]>[]> {
        return [NekoCommand];
    }
}
