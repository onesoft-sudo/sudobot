#include <stdio.h>
#include <stdbool.h>
#include <stdlib.h>
#include <assert.h>
#include <concord/discord.h>
#include "io/log.h"

#include "sudobot.h"

bool libsudobot_native_start(const char *token)
{
    if (token == NULL)
    {
        log_error("%s(...): Token must not be null!", __func__);
        return false;
    }

    return sudobot_start_with_token(token);
}