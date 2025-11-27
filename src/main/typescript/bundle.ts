Object.defineProperty(global, "isBundle", { value: true });

import "./preload";
import { BUNDLE_DATA_SYMBOL } from "@framework/utils/bundle";
import Resource from "@framework/resources/Resource";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore This file will only be created when a bundler is executed
import { classes, services, commands, events, resources } from "./imports.gen";

Object.defineProperty(global, BUNDLE_DATA_SYMBOL, {
    value: {
        classes,
        services,
        commands,
        events,
        resources
    }
});

for (const [id, data] of Object.entries(resources)) {
    Resource.registerResource(id, data);
}

import "./main";
