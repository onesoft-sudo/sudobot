#include <concord/log.h>
#include <concord/chash.h>
#include <string.h>
#include <ctype.h>
#include <assert.h>
#include "command.h"
#include "../commands/settings/about.h"
#include "../utils/strutils.h"
#include "../utils/xmalloc.h"

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

struct commands_table_bucket
{
    char *key;
    cmd_callback_t value;
    int state;
};

struct commands_table
{
    int length;
    int capacity;
    struct commands_table_bucket *buckets;
};

#define COMMANDS_TABLE_INIT(bucket, _key, _value) \
    chash_default_init(bucket, _key, _value)
#define COMMANDS_TABLE_HEAP 1
#define COMMANDS_TABLE_BUCKET struct commands_table_bucket
#define COMMANDS_TABLE_FREE_KEY(key)
#define COMMANDS_TABLE_HASH(key, hash) chash_string_hash(key, hash)
#define COMMANDS_TABLE_FREE_VALUE(value) NULL
#define COMMANDS_TABLE_COMPARE(cmp_a, cmp_b) chash_string_compare(cmp_a, cmp_b)

static struct commands_table *table = NULL;

static void commands_register()
{
    chash_assign(table, "about", &command_about, COMMANDS_TABLE);
}

void commands_init()
{
    table = chash_init(table, COMMANDS_TABLE);
    commands_register();
}

void command_on_message_handler(struct discord *client, const struct discord_message *message)
{
    if (message->author->bot || !str_starts_with(message->content, PREFIX))
    {
        return;
    }

    assert(table != NULL && "Command table is null");

    size_t prefix_len = strlen(PREFIX);
    assert(prefix_len != 0 && "Prefix cannot be an empty string");
    const char *content = message->content + prefix_len;
    char **argv;
    size_t argc;

    command_argv_create(content, &argc, &argv);
    command_argv_print(argc, argv);

    const char *command_name = argv[0];
    bool command_exists = chash_contains(table, command_name, command_exists, COMMANDS_TABLE);

    if (!command_exists)
    {
        log_debug("Command not found: %s", command_name);
        goto command_on_message_handler_end;
    }

    cmd_callback_t callback = chash_lookup(table, (char *)command_name, callback, COMMANDS_TABLE);

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