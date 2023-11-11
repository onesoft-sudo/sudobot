#ifndef SUDOBOT_CORE_COMMAND_H
#define SUDOBOT_CORE_COMMAND_H

#include <stdlib.h>
#include <stdbool.h>
#include <concord/discord.h>

#define CMD_MODE_INTERACTION (CMD_MODE_CHAT_INPUT_COMMAND_INTERACTION | CMD_MODE_CONTEXT_MENU_INTERACTION)
#define CMD_MODE_ALL (CMD_MODE_INTERACTION | CMD_MODE_LEGACY)
#define CMD_MODE_BASIC (CMD_MODE_CHAT_INPUT_COMMAND_INTERACTION | CMD_MODE_LEGACY)

typedef enum sudobot_command_context_type
{
    CMDCTX_LEGACY,
    CMDCTX_CHAT_INPUT_COMMAND_INTERACTION
} cmdctx_type_t;

typedef struct sudobot_command_context
{
    cmdctx_type_t type;

    union
    {
        const struct discord_message *message;
        const struct discord_interaction *interaction;
    };

    bool is_legacy;
    bool is_interaction;
    bool is_chat_input_command_interaction;
    const char *command_name;
    size_t argc;
    const char **argv;
} cmdctx_t;

typedef void (*cmd_callback_t)(struct discord *, cmdctx_t);

enum command_mode
{
    CMD_MODE_LEGACY = 1,
    CMD_MODE_CHAT_INPUT_COMMAND_INTERACTION = 2,
    CMD_MODE_CONTEXT_MENU_INTERACTION = 4,
};

struct command_info
{
    const char *name;
    cmd_callback_t callback;
    int mode;
    const char *description;
    enum discord_application_command_types type;
};

void command_on_message_handler(struct discord *client, const struct discord_message *message);
void register_slash_commands(struct discord *client, u64snowflake guild);
void command_on_interaction_handler(struct discord *client, const struct discord_interaction *interaction);

#endif /* SUDOBOT_CORE_COMMAND_H */
