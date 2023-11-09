#include <stdio.h>
#include <stdlib.h>
#include <concord/discord.h>
#include <concord/log.h>

#include "events/on_ready.h"
#include "events/on_message.h"
#include "utils/strutils.h"
#include "core/command.h"
#include "sudobot.h"

#define ENV_BOT_TOKEN "BOT_TOKEN"

int main(void)
{
    sudobot_start();
    return 0;
}
