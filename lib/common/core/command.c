#include <concord/chash.h>
#include <string.h>
#include <ctype.h>
#include <assert.h>
#include "command.h"
#include "../commands/settings/about.h"
#include "../utils/strutils.h"
#include "../utils/xmalloc.h"
#include "../io/log.h"

static void command_argv_create(const char *content, size_t *_argc, char ***_argv)
{
    char **argv = NULL;
    size_t argc = 0;
    char *trimmed_content = str_trim(content);
    size_t content_length = strlen(trimmed_content);
    char *tmpstr = NULL;
    size_t tmpstrlen = 0;

    for (size_t i = 0; i < content_length; i++)
    {
        if (isspace(trimmed_content[i]))
        {
            tmpstr = xrealloc(tmpstr, ++tmpstrlen);
            tmpstr[tmpstrlen - 1] = 0;
            argv = xrealloc(argv, (++argc) * (sizeof(char *)));
            argv[argc - 1] = tmpstr;
            tmpstr = NULL;
            tmpstrlen = 0;
            continue;
        }

        tmpstr = xrealloc(tmpstr, ++tmpstrlen);
        tmpstr[tmpstrlen - 1] = trimmed_content[i];
    }

    if (tmpstrlen > 0)
    {
        tmpstr = xrealloc(tmpstr, ++tmpstrlen);
        tmpstr[tmpstrlen - 1] = 0;
        argv = xrealloc(argv, (++argc) * (sizeof(char *)));
        argv[argc - 1] = tmpstr;
    }

    *_argc = argc;
    *_argv = argv;
    free(trimmed_content);
}

static void command_argv_free(size_t argc, char **argv)
{
    for (size_t i = 0; i < argc; i++)
    {
        free(argv[i]);
    }

    free(argv);
}

static void command_argv_print(size_t argc, char **argv)
{
#ifndef NDEBUG
    log_debug("%s(%zu, %p):", __func__, argc, argv);

    for (size_t i = 0; i < argc; i++)
    {
        log_debug("    argv[%zu]: %s", i, argv[i]);
    }
#endif
}

#define PREFIX "-"

struct command_info
{
    const char *name;
    cmd_callback_t callback;
};

static struct command_info const command_list[] = {
    { "about", &command_about },
};

static size_t command_count = sizeof (command_list) / sizeof (command_list[0]);

const struct command_info *command_find_by_name(const char *name)
{
    for (size_t i = 0; i < command_count; i++)
    {
        if (strcmp(name, command_list[i].name) == 0)
        {
            return &command_list[i];
        }
    }

    return NULL;
}

void command_on_message_handler(struct discord *client, const struct discord_message *message)
{
    if (message->author->bot || !str_starts_with(message->content, PREFIX))
    {
        return;
    }

    size_t prefix_len = strlen(PREFIX);
    assert(prefix_len != 0 && "Prefix cannot be an empty string");
    const char *content = message->content + prefix_len;
    char **argv;
    size_t argc;

    command_argv_create(content, &argc, &argv);
    command_argv_print(argc, argv);

    const char *command_name = argv[0];
    const struct command_info *command = command_find_by_name(command_name);
    
    if (command == NULL)
    {
        log_debug("Command not found: %s", command_name);
        goto command_on_message_handler_end;
    }

    cmd_callback_t callback = command->callback;

    cmdctx_t context = {
        .type = CMDCTX_LEGACY,
        .is_legacy = true,
        .is_chat_input_command_interaction = false,
        .is_interaction = false,
        .argc = argc,
        .argv = (const char **)argv,
        .command_name = command_name,
        .message = message,
    };

    callback(client, context);

command_on_message_handler_end:
    command_argv_free(argc, argv);
}
