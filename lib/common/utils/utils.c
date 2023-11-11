#include <errno.h>
#include <string.h>
#include <stdarg.h>
#include <stdlib.h>
#include "utils.h"

const char *get_last_error()
{
    return strerror(errno);
}

void free_varg(void *ptr1, ...)
{
    va_list args;
    va_start(args, ptr1);
    free(ptr1);
    void *arg;

    while ((arg = va_arg(args, void *)) != FREE_VARG_ENDARG)
        free(arg);

    va_end(args);
}