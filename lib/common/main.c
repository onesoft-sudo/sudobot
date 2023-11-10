#include <concord/discord.h>
#include <concord/log.h>
#include <stdio.h>
#include <stdlib.h>

#include "core/command.h"
#include "events/on_message.h"
#include "events/on_ready.h"
#include "io/printf.h"
#include "sudobot.h"
#include "utils/strutils.h"

#define ENV_BOT_TOKEN "BOT_TOKEN"

int main(void)
{
    sudobot_start();
    return 0;
}
