#ifndef SUDOBOT_EVENTS_ON_MESSAGE_H
#define SUDOBOT_EVENTS_ON_MESSAGE_H

#include <concord/discord.h>

void on_message(struct discord *client, const struct discord_message *message);

#endif /* SUDOBOT_EVENTS_ON_MESSAGE_H */
