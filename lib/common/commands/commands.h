#ifndef SUDOBOT_COMMANDS_COMMANDS_H
#define SUDOBOT_COMMANDS_COMMANDS_H

#include <stdlib.h>
#include "../core/command.h"
#include "../commands/settings/about.h"

static struct command_info const command_list[] = {
    { "about", &command_about, CMD_MODE_BASIC, "Shows information about the bot", DISCORD_APPLICATION_CHAT_INPUT },
};

static size_t command_count = sizeof (command_list) / sizeof (command_list[0]);

#endif /* SUDOBOT_COMMANDS_COMMANDS_H */