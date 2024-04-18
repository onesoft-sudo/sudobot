#ifndef SUDOBOT_EVENTS_ON_INTERACTION_H
#define SUDOBOT_EVENTS_ON_INTERACTION_H

#include <concord/discord.h>

void on_interaction_create(struct discord *client, const struct discord_interaction *interaction);

#endif /* SUDOBOT_EVENTS_ON_INTERACTION_H */
