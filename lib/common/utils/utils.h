#ifndef SUDOBOT_UTILS_UTILS_H
#define SUDOBOT_UTILS_UTILS_H

#define FREE_VARG_ENDARG ((void *) 0xFFFFFFFFFFFFFFFFUL)
#define dealloc(...) free_varg(__VA_ARGS__, FREE_VARG_ENDARG)

const char *get_last_error();
void free_varg(void *ptr1, ...);

#endif /* SUDOBOT_UTILS_UTILS_H */