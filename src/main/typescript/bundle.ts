Object.defineProperty(global, "isBundle", { value: true });

import "./preload";
import { BUNDLE_DATA_SYMBOL } from "@framework/utils/bundle";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore This file will only be created when a bundler is executed
import { classes, services, commands, events } from "./imports";

Object.defineProperty(global, BUNDLE_DATA_SYMBOL, {
    value: {
        classes,
        services,
        commands,
        events
    }
});

import "./main";
