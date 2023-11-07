#define _GNU_SOURCE

#include <stdio.h>
#include <stdbool.h>
#include <stdlib.h>
#include <assert.h>
#include <signal.h>
#include <concord/discord.h>
#include <concord/log.h>

#include "events/on_ready.h"
#include "events/on_message.h"
#include "utils/strutils.h"
#include "core/command.h"
#include "utils/utils.h"
#include "sudobot.h"

#define ENV_BOT_TOKEN "TOKEN"

static const uint64_t INTENTS = DISCORD_GATEWAY_GUILD_MESSAGES |
                                DISCORD_GATEWAY_GUILD_MEMBERS |
                                DISCORD_GATEWAY_GUILDS |
                                DISCORD_GATEWAY_MESSAGE_CONTENT;

struct discord *client;

void sudobot_atexit()
{
    discord_cleanup(client);
}

void sudobot_sigterm_handler()
{
    log_info("SIGTERM received. Exiting");
    exit(EXIT_SUCCESS);
}

void sudobot_setup_signal_handlers()
{
    struct sigaction act = {0};
    act.sa_handler = &sudobot_sigterm_handler;

    if (sigaction(SIGTERM, &act, NULL) != 0)
    {
        log_error("Failed to set up signal handlers: %s", get_last_error());
        exit(EXIT_FAILURE);
    }
}

bool sudobot_start_with_token(const char *token)
{
    assert(token != NULL && "Token must not be null");
    client = discord_init(token);
    atexit(&sudobot_atexit);
    sudobot_setup_signal_handlers();

    log_info("Attempting to boot...");
    discord_add_intents(client, INTENTS);
    discord_set_on_message_create(client, &on_message);
    discord_set_on_ready(client, &on_ready);
    commands_init();
    discord_run(client);

    return true;
}

bool sudobot_start()
{
    const char *token = getenv(ENV_BOT_TOKEN);

    if (token == NULL)
    {
        log_error("No environment variable named `" ENV_BOT_TOKEN "` is present. Please set it and then rerun the bot.");
        return false;
    }

    return sudobot_start_with_token(token);
}
