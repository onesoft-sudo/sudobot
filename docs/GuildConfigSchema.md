# SudoBot Configuration

SudoBot's behavior is controlled through a comprehensive JSON schema. This README provides an overview of the Guild Configuration Schema, allowing you to tailor the bot's behavior to suit your server's needs. Refer to [GuildConfigSchema.ts](GuildConfigSchema.ts) for the complete schema.

## Guild Configuration Schema

The Guild Configuration Schema encompasses various settings for SudoBot. Below are detailed explanations for key sections of the schema:

### Prefix and Debug Mode

- **`prefix`**: Defines the command prefix for SudoBot. By default, commands are triggered with a prefix of `-`. You can customize this to align with your server's preferences.

- **`debug_mode`**: When set to `true`, enables debug mode, providing additional information useful for developers. Typically, debug mode is disabled in production environments.

### Commands Configuration

- **`commands`**: Configuration related to bot commands.

  - **`mention_prefix`**: If set to `true`, allows commands to be triggered with mentions (e.g., `@SudoBot help`). If set to `false`, only the command prefix triggers commands.

  - **`bean_safe`**, **`shot_safe`**, **`fakeban_safe`**: Arrays of Snowflake IDs for safe actions. Users with these IDs are exempt from certain actions.

  - **`echo_mentions`**: Toggles echoing of mentions in command responses. If set to `true`, mentions in command responses are echoed; otherwise, they are removed.

  - **`moderation_command_behaviour`**: Specifies the behavior for moderation commands, either "delete" (delete the command message) or "default" (keep the command message).

  - **`rerun_on_edit`**: When set to `true`, the bot will rerun commands when they are edited.

  - **`default_joke_type`**: Sets the default type for joke commands. Options are "random", "joke", or "dadjoke".

### Permissions Configuration

- **`permissions`**: Configuration for managing permissions.

  - **`mod_role`**, **`admin_role`**, **`staff_role`**: (DEPRECATED) Use available permission systems instead.

  - **`invincible_roles`**: Array of Snowflake IDs for roles with invincible permissions. Members with these roles have immunity from certain actions.

  - **`mode`**: Permission mode. Options are "discord" (Discord roles only), "levels" (experience/leveling system), or "layered" (combination of Discord roles and levels).

  - **`check_discord_permissions`**: Checking mode for Discord permissions. Options are "both" (check both Discord and custom permissions), "automod" (check custom permissions only for automod actions), "manual_actions" (check custom permissions only for manual actions), or "none" (do not check custom permissions).


## Example Usage

```typescript
// Example usage of the configuration schema
import { GuildConfigSchema, GuildConfig } from './path-to-your-config-file';

const defaultConfig: GuildConfig = GuildConfigSchema.parse({
  // ... default configuration values
});

// Modify the configuration as needed
const modifiedConfig: GuildConfig = {
  ...defaultConfig,
  // ... custom modifications
};
