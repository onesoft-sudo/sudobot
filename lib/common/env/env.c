#define _GNU_SOURCE

#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <errno.h>
#include <ctype.h>
#include <concord/chash.h>
#include "../io/log.h"
#include "../io/io.h"
#include "env.h"
#include "../utils/xmalloc.h"
#include "../utils/utils.h"
#include "../utils/strutils.h"
#include "../flags.h"
#include "../sudobot.h"

#define ENVTABLE_BUCKET struct envtable_bucket
#define ENVTABLE_HEAP 1
#define ENVTABLE_FREE_KEY(key)          free(key)
#define ENVTABLE_HASH(key, hash)        chash_string_hash(key, hash)
#define ENVTABLE_FREE_VALUE(value)      free(value)
#define ENVTABLE_COMPARE(cmp_a, cmp_b)  chash_string_compare(cmp_a, cmp_b)
#define ENVTABLE_INIT(bucket, _key, _value) chash_default_init(bucket, _key, _value)

struct envtable_bucket 
{
    char *key;
    char *value;
    int state;
};

struct envtable
{
    int length;
    int capacity;
    struct envtable_bucket *buckets;
};

static char *env_find_file_path();

env_t *env_init()
{
    env_t *env = xcalloc(1, sizeof (env_t));
    struct envtable *table = chash_init(table, ENVTABLE);
    env->table = table;
    env->filepath = env_find_file_path();
    env->error = NULL;
    env->contents = NULL;
    env->index = 0;
    env->length = 0;
    env->current_line = 1;
    return env;
}

static char *get_file_contents(FILE *file, size_t *sizeptr)
{
    size_t size = 0;
    char *buffer = NULL;

    fseek(file, 0, SEEK_END);
    size = ftell(file);
    fseek(file, 0, SEEK_SET);

    buffer = xmalloc(size + 1);
    
    if (fread(buffer, size, 1, file) <= 0)
        return NULL;

    buffer[size] = 0;

    if (sizeptr != NULL)
        *sizeptr = size;

    return buffer;
}

static char *env_find_file_path()
{
    char *path = opt_env_file_path;

    if (path == NULL)
    {
        char *cwd = NULL;
        size_t len = 0;

        cwd = getcwd(NULL, 0);

        if (cwd == NULL)
            sudobot_fatal_error("Failed to get the current working directory path");

        len = strlen(cwd);

        cwd = xrealloc(cwd, len + 6);
        strncat(cwd, "/.env", 6);
        path = cwd;
    }
    else
    {
        path = strdup(path);
    }

    return path;
}

static void env_file_read_contents(env_t *env)
{
    char *path = env->filepath;

    log_info("Loading environment variables from: %s", path);

    FILE *file = fopen(path, "r");

    if (file == NULL)
    {
        if (errno == ENOENT && opt_env_file_path == NULL)
            log_warn("No `.env` file was found in the current directory");
        else
            log_warn("Failed to open file: %s: %s", path, get_last_error());

        return;
    }
    
    env->contents = get_file_contents(file, &env->length);
    fclose(file);
}

static bool is_newline(const char c)
{
    return c == '\r' || c == '\n';
}

static char *env_parse_var_name(env_t *env)
{
    char *name = NULL;
    size_t namelen = 0;

    while (env->index < env->length &&
            isblank(env->contents[env->index])) 
        env->index++;

    while (env->index < env->length && 
        (isalnum(env->contents[env->index]) || env->contents[env->index] == '_') && 
        env->contents[env->index] != '=')
    {
        name = xrealloc(name, ++namelen);
        name[namelen - 1] = env->contents[env->index];
        env->index++;
    }

    bool success = false;

    if (name == NULL)
        env->error = strdup("Variable name must not be empty");
    else if (env->contents[env->index] == '=')
        success = true;
    else if (is_newline(env->contents[env->index]))
        env->error = strdup("Unexpected EOL");
    else if (isspace(env->contents[env->index]))
        env->error = strdup("Variable name must not contain spaces");
    else if (!(isalnum(env->contents[env->index]) || env->contents[env->index] == '_'))
    {
        env->error = strdup("Invalid variable name: variable names must not contain anything except numbers, letters and underscores");
        log_debug("C: %c", env->contents[env->index]);
    }
    else
        success = true;

    if (!success || name == NULL)
    {
        free(name);
        return NULL;
    }

    name = xrealloc(name, ++namelen);
    name[namelen - 1] = 0;
    return name;
}

static char *env_parse_var_value(env_t *env)
{
    char *value = NULL;
    size_t value_len = 0;
    bool include_spaces = false;
    char quote = '0';

    while (env->index < env->length &&
            isblank(env->contents[env->index])) 
        env->index++;

    if (env->contents[env->index] == '"' || env->contents[env->index] == '\'')
    {
        quote = env->contents[env->index];
        include_spaces = true;
        env->index++;
    }

    while (env->index < env->length &&
            ((include_spaces && env->contents[env->index] != quote) ||
             (!include_spaces && !isspace(env->contents[env->index])))) 
    {
        if (include_spaces && is_newline(env->contents[env->index]))
        {
            free(value);
            env->error = strdup("A variable value must not exceed one line");
            return NULL;
        }

        value = xrealloc(value, ++value_len);
        value[value_len - 1] = env->contents[env->index];
        env->index++;
    }

    if (env->index >= env->length && (include_spaces || value_len == 0))
    {
        free(value);
        env->error = strdup(include_spaces ? "Unexpected EOF: Unterminated string" : "Unexpected EOF");
        return NULL;
    }

    if (include_spaces && env->contents[env->index] != quote) 
    {
        free(value);
        env->error = strdup("Unterminated string");
        return NULL;
    }
    else if (include_spaces) 
        env->index++;

    if (isspace(env->contents[env->index]))
        env->index++;

    if (value == NULL)
        return NULL;

    value = xrealloc(value, ++value_len);
    value[value_len - 1] = 0;
    return value;
}

static bool env_parse_load(env_t *env)
{
    while (env->index < env->length)
    {
        if (env->contents[env->index] == '#')
        {
            while (env->index < env->length && !is_newline(env->contents[env->index]))
                env->index++;

            if (is_newline(env->contents[env->index]))
                env->current_line++;

            continue;
        }
        else if (isspace(env->contents[env->index]))
        {
            if (is_newline(env->contents[env->index]))
                env->current_line++;

            env->index++;
            continue;
        }
        else 
        {
            char *varname = env_parse_var_name(env);

            if (varname == NULL || env->error != NULL)
                return false;

            env->index++;

            char *varval = env_parse_var_value(env);

            if (env->error != NULL)
                return false;

            chash_assign(env->table, varname, varval, ENVTABLE);
            continue;
        }

        if (env->error != NULL)
            return false;

        env->index++;
    }

    return true;
}

bool env_load(env_t *env)
{
    env_file_read_contents(env);

    if (env->contents == NULL)
        return false;

    return env_parse_load(env);
}

void env_free(env_t *env)
{
    chash_free(env->table, ENVTABLE);
    free(env->error);
    free(env->contents);
    free(env->filepath);
    free(env);
}

const char *env_get_local(env_t *env, const char *restrict name)
{
    int contains = chash_contains(env->table, "TOKEN", contains, ENVTABLE);;
    char *value;

    if (contains == 0)
        return NULL;
        
    value = chash_lookup(env->table, name, value, ENVTABLE);
    return value;
}

const char *env_get(env_t *env, const char *restrict name)
{
    const char *value = env_get_local(env, name);

    if (value == NULL)
        return getenv(name);

    return value;
}