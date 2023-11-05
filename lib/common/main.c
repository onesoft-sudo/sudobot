#include <stdio.h>
#include <stdlib.h>
#include <concord/discord.h>
#include <concord/log.h>

#include "events/on_ready.h"

#define ENV_BOT_TOKEN "BOT_TOKEN"

int main(void)
{
    const char *token = getenv(ENV_BOT_TOKEN);
    struct discord *client;

    if (token == NULL)
    {
        log_error("No environment variable named `" ENV_BOT_TOKEN "` is present. Please set it and then rerun the bot.");
        exit(EXIT_FAILURE);
    }

    log_info("Attempting to boot...");
    client = discord_init(token);
    discord_set_on_ready(client, &on_ready);
    discord_run(client);
    return 0;
}