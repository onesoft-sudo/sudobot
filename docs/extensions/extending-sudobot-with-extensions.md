# Extending SudoBot with Extensions

{% hint style="warning" %}
This page isn't complete yet, please be patient, we'll complete writing this page as soon as possible. You can also help us write the documentation!
{% endhint %}

SudoBot has support for extensions, and it was introduced in version 6.17. Extensions can extend the bot's feature, by adding commands, event listeners, services and a lot more stuff. You can install/uninstall/disable extensions, or create your own to make the bot behave exactly how you want. Extensions can be written using JavaScript and TypeScript.

In this article, you'll learn how SudoBot's extension system works.

## The `extensions` directory

The `extensions` is a special directory in the project root. Every installed extension stays inside this directory. If you want to install extensions, you have to create a directory named `extensions/` in the project root.

Each installed extension has a directory associated with it inside the `extensions/` directory. Inside of that inner directory, there is a special file `extension.json` which contains meta information about the extension, and how to build it.

The `extension.json` file looks something like this:

```json5
{
    "main": "./build/index.js",        /* The entry point. */
    "commands": "./build/commands",    /* Commands directory. The bot will load commands from this directory. */
    "events": "./build/events",        /* Event handlers directory. The bot will load event handlers from this directory. */
    "language": "typescript",          /* The language being used for this extension. Can be either "javascript" or "typescript". */
    "main_directory": "./build",       /* The main directory where the entry point is located. */
    "build_command": "npm run build"   /* Command to build the extension. In this case `npm run build` invokes `tsc`. */
}
```

