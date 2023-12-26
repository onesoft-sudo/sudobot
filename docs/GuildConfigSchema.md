# SudoBot Configuration

SudoBot's behavior is controlled through a comprehensive JSON schema. This README provides an overview of the Guild Configuration Schema, allowing you to tailor the bot's behavior to suit your server's needs. Refer to [GuildConfigSchema.ts](https://github.com/onesoft-sudo/sudobot/blob/main/src/types/GuildConfigSchema.ts) and [SystemConfigSchema.ts](https://github.com/onesoft-sudo/sudobot/blob/main/src/types/SystemConfigSchema.ts) for the complete schema.

## Guild Configuration Schema
 
The Guild Configuration Schema encompasses various settings for SudoBot. Below are detailed explanations for key sections of the schema:

### Prefix and Debug Mode

- **`prefix`**: Defines the command prefix for SudoBot. By default, commands are triggered with a prefix of `-`. You can customize this to align with your server's preferences.

- **`debug_mode`**: When set to `true`, enables debug mode, providing additional information useful for developers. Typically, debug mode is disabled in production environments.

### Commands Configuration

- **`commands`**: Configuration related to bot commands.

  - **`mention_prefix`**: If set to `true`, allows commands to be triggered with mentions (e.g., `@SudoBot help`). If set to `false`, only the command prefix triggers commands.

  - **`bean_safe`**, **`shot_safe`**, **`fakeban_safe`**: Arrays of User IDs who are immune from bean, shot or fakeban commands.

  - **`echo_mentions`**: If set to "True" option tells the bot whether to also ping roles when someone uses the echo comamnd.

  - **`moderation_command_behaviour`**: Specifies the behavior for moderation commands, either "delete" (delete the command message) or "default" (keep the command message).

  - **`rerun_on_edit`**: When set to `true`, the bot will rerun commands when they are edited.

  - **`default_joke_type`**: Sets the default type for joke commands. Options are "random", "joke", or "dadjoke".

### Permissions Configuration

- **`permissions`**: Configuration for managing permissions.

  - **`mod_role`**, **`admin_role`**, **`staff_role`**: (DEPRECATED) Use available permission systems instead.

  - **`invincible_roles`**: Array of Snowflake IDs for roles with invincible permissions. Members with these roles have immunity from certain actions.

  - **`mode`**: Permission mode. Options are "discord" (Discord roles only), "levels" (0-100), or "layered" (permission overwrite based system).

  - **`check_discord_permissions`**: This option checks for role positions when taking actions by using commands, or when AutoMod decides to take an action. If this is "false", none of those safe permission checking will be done.