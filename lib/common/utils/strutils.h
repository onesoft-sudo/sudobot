#ifndef SUDOBOT_UTILS_STRING_H
#define SUDOBOT_UTILS_STRING_H

char *str_ltrim(const char *restrict str);
char *str_rtrim(const char *restrict str);
char *str_trim(const char *restrict str);
bool str_starts_with(const char *restrict haystack, const char *restrict needle);

#endif /* SUDOBOT_UTILS_STRING_H */