#include "on_interaction.h"
#include "../core/command.h"

void on_interaction_create(struct discord *client, const struct discord_interaction *interaction)
{
    if (interaction->type == DISCORD_INTERACTION_PING) 
        return;

    command_on_interaction_handler(client, interaction);
}