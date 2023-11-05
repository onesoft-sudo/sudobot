#ifndef SUDOBOT_ON_READY
#define SUDOBOT_ON_READY

#include <concord/discord.h>

void on_ready(struct discord *client, const struct discord_ready *event);

#endif /* SUDOBOT_ON_READY */
