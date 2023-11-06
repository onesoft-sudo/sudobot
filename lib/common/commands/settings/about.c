#include <concord/log.h>
#include "about.h"

void command_about(struct discord *client, cmdctx_t context)
{
    struct discord_create_message params = {
        .content = "First response from SudoBot v7, which is written in C!",
        .message_reference = &(struct discord_message_reference){
            .channel_id = context.message->channel_id,
            .fail_if_not_exists = false,
            .guild_id = context.message->guild_id,
            .message_id = context.message->id,
        },
    };

    discord_create_message(client, context.message->channel_id, &params, NULL);
}