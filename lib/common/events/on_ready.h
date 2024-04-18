#ifndef SUDOBOT_EVENTS_ON_READY_H
#define SUDOBOT_ON_READY_H

#include <concord/discord.h>

void on_ready(struct discord *client, const struct discord_ready *event);

#endif /* SUDOBOT_EVENTS_ON_READY_H */
