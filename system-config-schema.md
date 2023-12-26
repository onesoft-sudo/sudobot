# SudoBot System Configuration

SudoBot's behavior can be customized using a comprehensive system configuration schema. This document provides an overview of key configuration options and how to tailor the bot to your needs.

## Table of Contents

- [Overview](#overview)
- [Configuration Schema](#configuration-schema)
- [Emojis](#emojis)
- [System Admins](#system-admins)
- [Snippets](#snippets)
- [Presence](#presence)
- [Commands](#commands)
- [Logging](#logging)
- [API Status](#api-status)
- [Extensions](#extensions)
- [Log Server](#log-server)
- [Debug Mode](#debug-mode)

## Overview

The system configuration for SudoBot is defined using TypeScript and the `zod` library. The configuration schema provides a structured way to set various options, allowing you to customize the bot's behavior according to your preferences.

## Configuration Schema

The [SystemConfigSchema](https://github.com/onesoft-sudo/sudobot/blob/main/src/types/SystemConfigSchema.ts) defines the entire system configuration. Refer to this file for detailed information on each configuration option.

## Emojis

Customize emojis used by the bot. The `emojis` configuration allows you to set specific emoji strings for different purposes within the bot.

## System Admins

Specify users with system admin privileges using the `system_admins` configuration. Users in this list have elevated access to manage and configure the bot.

## Snippets

Configure snippet-related settings using the `snippets` configuration. This includes options like saving attachments with snippets.

## Presence

Set the bot's name, status, and activity type using the `presence` configuration. Define the bot's online status, custom status message, and activity type.

## Commands

Customize command-related options using the `commands` configuration. For example, enable or disable the mention prefix for commands.

## Logging

Enable logging and specify channels for logs with the `logging` configuration. This section includes options to control various aspects of logging within the bot.

## API Status

The `api` configuration provides information about the bot's API status. Check the operational status of the server and view related details such as server status and description.

## Extensions

The `extensions` configuration allows you to control the default mode for extensions. Specify whether to enable or disable all extensions by default.

## Log Server

Configure the log server using the `log_server` configuration. Options include enabling and auto-starting the log server.

## Debug Mode

Enable or disable debug mode with the `debug_mode` configuration. Debug mode provides additional logging and information helpful for troubleshooting.
