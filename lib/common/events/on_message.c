#include "on_message.h"
#include "../core/command.h"

void on_message(struct discord *client, const struct discord_message *message)
{
    command_on_message_handler(client, message);
}