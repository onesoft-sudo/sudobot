#include <string.h>
#include <ctype.h>
#include <stdbool.h>
#include "strutils.h"
#include "xmalloc.h"

/**
 * @brief Allocates a buffer and stores the left-trimmed string into it.
 */
char *str_ltrim(const char *restrict str)
{
    size_t length = strlen(str);

    if (length == 0)
    {
        return strdup(str);
    }

    char *outstr = xmalloc(length + 1);
    bool is_start = true;
    size_t j = 0;

    for (size_t i = 0; i < length; i++)
    {
        if (is_start && isspace(str[i]))
            continue;
        else if (is_start)
            is_start = false;

        outstr[j++] = str[i];
    }

    outstr[j] = 0;
    return outstr;
}

/**
 * @brief Allocates a buffer and stores the right-trimmed string into it.
 */
char *str_rtrim(const char *restrict str)
{
    size_t length = strlen(str);

    if (length == 0)
    {
        return strdup(str);
    }

    char *outstr = xmalloc(length + 1);
    size_t spaces = 0;

    for (size_t i = length;; i--)
    {
        if (str[i] == 0)
            continue;

        if (isspace(str[i]))
            spaces++;
        else
            break;

        if (i == 0)
            break;
    }

    for (size_t i = 0; i < (length - spaces); i++)
    {
        outstr[i] = str[i];
    }

    outstr[length - spaces] = 0;
    return outstr;
}

/**
 * @brief Allocates a buffer and stores the both right and left-trimmed string into it.
 */
char *str_trim(const char *restrict str)
{
    char *ltrimmed = str_ltrim(str);
    char *final = str_rtrim(ltrimmed);
    free(ltrimmed);
    return final;
}

bool str_starts_with(const char *restrict haystack, const char *restrict needle)
{
    size_t haystack_length = strlen(haystack);
    size_t needle_length = strlen(needle);

    if (haystack_length < needle_length)
    {
        return false;
    }

    for (size_t i = 0; i < needle_length; i++)
    {
        if (haystack[i] != needle[i])
        {
            return false;
        }
    }

    return true;
}