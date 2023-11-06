#include <concord/log.h>
#include <stdlib.h>
#include "utils.h"
#include "xmalloc.h"

#define OLDPTR_NONE ((unsigned long long int *)0xFFFFFFFFFFFFFFFFUL)

static _Noreturn void xalloc_failed(const char *fn_name, size_t bufsize, size_t nblks, void *oldptr)
{
    if (((unsigned long long int *)oldptr) != OLDPTR_NONE)
        log_fatal("%s(ptr: %p, size: %zu): failed to allocate memory: %s", fn_name, oldptr, bufsize, get_last_error());
    else
        log_fatal("%s(size: %zu, nblks: %zu): failed to allocate memory: %s", fn_name, bufsize, nblks, get_last_error());

    exit(EXIT_FAILURE);
}

void *xmalloc(size_t size)
{
    void *ptr = malloc(size);

    if (ptr == NULL)
    {
        xalloc_failed(__func__, size, 1, OLDPTR_NONE);
        return NULL;
    }

    return ptr;
}

void *xcalloc(size_t n, size_t size)
{
    void *ptr = calloc(n, size);

    if (ptr == NULL)
    {
        xalloc_failed(__func__, size, n, OLDPTR_NONE);
        return NULL;
    }

    return ptr;
}

void *xrealloc(void *oldptr, size_t newsize)
{
    void *ptr = realloc(oldptr, newsize);

    if (ptr == NULL)
    {
        xalloc_failed(__func__, newsize, 1, oldptr);
        return NULL;
    }

    return ptr;
}