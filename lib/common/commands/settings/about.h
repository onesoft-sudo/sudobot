#ifndef SUDOBOT_COMMANDS_ABOUT_H
#define SUDOBOT_COMMANDS_ABOUT_H

#include <concord/discord.h>
#include "../../core/command.h"

void command_about(struct discord *client, cmdctx_t context);

#endif /* SUDOBOT_COMMANDS_ABOUT_H */