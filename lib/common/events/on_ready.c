#include <concord/discord.h>
#include <concord/log.h>
#include "on_ready.h"

void on_ready(struct discord *client, const struct discord_ready *event)
{
    log_info("Successfully logged in as @%s!", event->user->username);
}