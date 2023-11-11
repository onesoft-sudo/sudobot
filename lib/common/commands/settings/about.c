#define _GNU_SOURCE

#include <concord/discord.h>
#include <string.h>
#include <stdio.h>
#include "about.h"
#include "../../utils/strutils.h"
#include "../../utils/defs.h"
#include "../../utils/utils.h"
#include "../../io/printf.h"

void command_about(struct discord *client, cmdctx_t context)
{
    struct discord_user user = { 0 };
    struct discord_ret_user ret_user = {
        .sync = &user
    };
    
    discord_get_current_user(client, &ret_user);

    const char *avatar = user.avatar;
    bool avatar_is_animated = avatar[0] == 'a' && avatar[1] == '_';
    const char *avatar_extension = avatar_is_animated ? "gif" : "png";
    char *icon_url = casprintf("https://cdn.discordapp.com/avatars/%lu/%s.%s",
                              user.id, avatar, avatar_extension);

    struct discord_embed_field embed_fields[] = {
        { .name = "Version", .value = SUDOBOT_VERSION, .Inline = true },
        { .name = "Source Code", .value = SUDOBOT_GITHUB_REPO_MD_LINK, .Inline = true },
        { .name = "Licensed Under", .value = SUDOBOT_LICENSE_MD_LINK, .Inline = true },
        { .name = "Author", .value = SUDOBOT_AUTHOR_MD_LINK, .Inline = true },
        { .name = "Support", .value = SUDOBOT_SUPPORT_EMAIL, .Inline = true },
    };
    
    struct discord_embeds embeds = {
        .array = & (struct discord_embed) {
            .author = & (struct discord_embed_author) {
                .name = "SudoBot",
                .icon_url = icon_url,
                .url = SUDOBOT_GITHUB_REPO
            },
            .color = SUDOBOT_THEME_COLOR,
            .description = "__**A free and open source Discord moderation bot.**__\n\
\n\
This bot is free software, and you are welcome to redistribute it under certain conditions.\n\
See the " SUDOBOT_LICENSE_MD_LINK " for more detailed information.\n",
            .fields = & (struct discord_embed_fields) {
                .array = embed_fields,
                .size = sizeof (embed_fields) / sizeof (embed_fields[0])
            },
            .footer = & (struct discord_embed_footer) {
                .text = "Copyright © OSN Developers 2022-2023. All rights reserved."
            }
        },
        .size = 1
    };
    
    struct discord_create_message params = {
        .embeds = &embeds,
        .message_reference = & (struct discord_message_reference) {
            .channel_id = context.message->channel_id,
            .fail_if_not_exists = false,
            .guild_id = context.message->guild_id,
            .message_id = context.message->id,
        },
    };

    discord_create_message(client, context.message->channel_id, &params, NULL);
    dealloc(icon_url);
}
