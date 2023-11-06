#ifndef SUDOBOT_UTILS_XMALLOC_H
#define SUDOBOT_UTILS_XMALLOC_H

#include <stdlib.h>

void *xmalloc(size_t size);
void *xcalloc(size_t n, size_t size);
void *xrealloc(void *oldptr, size_t newsize);

#endif /* SUDOBOT_UTILS_XMALLOC_H */