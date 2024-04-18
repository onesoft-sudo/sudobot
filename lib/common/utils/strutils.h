#ifndef SUDOBOT_UTILS_STRING_H
#define SUDOBOT_UTILS_STRING_H

#include <stdlib.h>

#define str_concat(...) str_concat_varg(__VA_ARGS__, NULL)

char *str_ltrim(const char *restrict str);
char *str_rtrim(const char *restrict str);
char *str_trim(const char *restrict str);
bool str_starts_with(const char *restrict haystack, const char *restrict needle);
char *str_concat_varg(const char *, ...);

#endif /* SUDOBOT_UTILS_STRING_H */
