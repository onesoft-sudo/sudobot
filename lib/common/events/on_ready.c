#include <concord/discord.h>
#include "../io/log.h"
#include "../flags.h"
#include "../core/command.h"
#include "on_ready.h"

#define GUILD_ID ((u64snowflake) 911987536379912193)

void on_ready(struct discord *client, const struct discord_ready *event)
{
    log_info("Successfully logged in as @%s!", event->user->username);

    if (flags_has(FLAG_UPDATE_COMMANDS)) 
        register_slash_commands(client, GUILD_ID);
}