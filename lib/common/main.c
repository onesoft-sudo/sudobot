#include <stdio.h>
#include <stdlib.h>
#include <concord/discord.h>
#include <concord/log.h>

#include "events/on_ready.h"
#include "events/on_message.h"
#include "utils/strutils.h"
#include "core/command.h"

#define ENV_BOT_TOKEN "BOT_TOKEN"

void command_create_argv(const char *content, size_t *_argc, char ***_argv);

int main(void)
{
    // printf("%i\n", str_starts_with("LMAO", "A"));
    // exit(0);
    const char *token = getenv(ENV_BOT_TOKEN);
    struct discord *client;

    if (token == NULL)
    {
        log_error("No environment variable named `" ENV_BOT_TOKEN "` is present. Please set it and then rerun the bot.");
        exit(EXIT_FAILURE);
    }

    log_info("Attempting to boot...");

    client = discord_init(token);

    discord_add_intents(client, DISCORD_GATEWAY_GUILD_MESSAGES |
                                    DISCORD_GATEWAY_GUILD_MEMBERS |
                                    DISCORD_GATEWAY_GUILDS |
                                    DISCORD_GATEWAY_MESSAGE_CONTENT);

    discord_set_on_message_create(client, &on_message);
    discord_set_on_ready(client, &on_ready);
    commands_init();
    discord_run(client);

    return 0;
}