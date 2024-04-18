#include <stdlib.h>
#include "flags.h"

char *opt_env_file_path = NULL;
static int flags = 0;

void flags_add(int flag)
{
    flags |= flag;
}

void flags_remove(int flag)
{
    flags &= ~flag;
}

void flags_set(int new_flags)
{
    flags = new_flags;
}

void flags_clear()
{
    flags = 0;
}

int flags_get()
{
    return flags;
}

bool flags_has(int flag)
{
    return (flags & flag) == flag;
}

void opt_cleanup()
{
    free(opt_env_file_path);
}