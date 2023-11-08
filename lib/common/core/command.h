#ifndef SUDOBOT_COMMAND_H
#define SUDOBOT_COMMAND_H

#include <stdlib.h>
#include <stdbool.h>
#include <concord/discord.h>

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

void command_on_message_handler(struct discord *client, const struct discord_message *message);

#endif /* SUDOBOT_COMMAND_H */
