#include "printf.h"

#include <assert.h>
#include <math.h>
#include <stdarg.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "../utils/xmalloc.h"

typedef enum format_flags format_flags_t;

enum format_flags
{
    FMT_STR = 0b0000000000001,
    FMT_INT = 0b0000000000010,
    FMT_UNSIGNED = 0b0000000000100,
    FMT_DECIMAL = 0b0000000001000,
    FMT_BINARY = 0b0000000010000,
    FMT_HEXADECIMAL = 0b0000000100000,
    FMT_OCTAL = 0b0000001000000,
    FMT_UNKNOWN = 0b0000010000000,
    FMT_INT_DEFAULT = 0b0000100000000,
    FMT_INT_LONG = 0b0001000000000,
    FMT_INT_LONG_LONG = 0b0010000000000,
    FMT_INT_SHORT = 0b0100000000000,
    FMT_LIT_SIZE = 0b1000000000000
};

static void
casprintf_buffer_push_char(char **buffer, size_t *buffer_size, const char c)
{
    size_t size = ++(*buffer_size);
    *buffer = xrealloc(*buffer, size);
    (*buffer)[size - 1] = c;
}

static void
casprintf_buffer_concat_str(char **buffer, size_t *buffer_size, const char *str)
{
    size_t len = strlen(str);
    *buffer_size += len;
    size_t size = *buffer_size;
    *buffer = xrealloc(*buffer, size);
    strncat(*buffer, str, len);
}

static format_flags_t casprintf_length_flags(
    const char *start, const char **next, size_t *literal_size, bool *_zero)
{
    format_flags_t flags = 0;
    char *sizebuf = NULL;
    size_t buflen = 0;
    bool zero = false;

    while (*start && *start >= '0' && *start <= '9')
    {
        if (*start == '0' && !zero)
        {
            zero = true;
            start++;
            continue;
        }

        casprintf_buffer_push_char(&sizebuf, &buflen, *start);
        start++;
    }

    if (buflen > 0 || zero)
    {
        size_t i = buflen - 1, size = 0, power = 0;

        if (buflen > 0)
        {
            while (true)
            {
                long long multiplier = (long long) powl(10, power++);
                int digit = sizebuf[i] - '0';

                assert(digit >= 0);

                size += multiplier * ((unsigned int) digit);

                if (i == 0)
                    break;

                i--;
            }
        }

        if (_zero != NULL)
        {
            *_zero = zero;
        }

        if (next != NULL)
        {
            *next = start;
        }

        free(sizebuf);
        *literal_size = size;
        return FMT_LIT_SIZE;
    }

    free(sizebuf);

    while (*start)
    {
        switch (*start)
        {
            case 'l':
                if (*(start + 1) == 'l')
                {
                    flags |= FMT_INT_LONG_LONG;
                    start++;
                }
                else
                    flags |= FMT_INT_LONG;

                break;

            case 'h':
                flags |= FMT_INT_SHORT;
                break;

            default:
#ifdef SUDOBOT_CASPRINTF_VERBOSE
                fprintf(
                    stderr, "%s: warning: unknown length specifier: %c\n",
                    __func__, *start);
#endif
                goto casprintf_length_flags_end;
        }

        start++;
    }

casprintf_length_flags_end:
    if (next != NULL)
    {
        *next = start;
    }

    return flags == 0 ? FMT_INT_DEFAULT : flags;
}

static format_flags_t casprintf_type_flag(const char c)
{
    format_flags_t flags = 0;

    switch (c)
    {
        case 'i':
        case 'd':
            flags = FMT_INT | FMT_DECIMAL;
            break;

        case 's':
            flags = FMT_STR;
            break;

        case 'u':
            flags = FMT_INT | FMT_UNSIGNED;
            break;

        default:
#ifdef SUDOBOT_CASPRINTF_VERBOSE
            fprintf(
                stderr, "%s: warning: unknown type specifier: %c\n", __func__,
                *start);
#endif
            return FMT_UNKNOWN;
    }

    return flags;
}

static void casprintf_concat(
    va_list *args, char **buffer, size_t *buffer_size, format_flags_t flags,
    size_t literal_size, bool zero)
{
    if (flags & FMT_INT)
    {
        uint64_t unsigned_arg =
            flags & FMT_INT_DEFAULT
                ? va_arg(*args, unsigned)
                : (flags & FMT_INT_LONG
                       ? va_arg(*args, unsigned long)
                       : (flags & FMT_INT_LONG_LONG
                              ? va_arg(*args, unsigned long long)
                              : (flags & FMT_INT_SHORT
                                     ? va_arg(*args, unsigned int)
                                     : va_arg(*args, unsigned int))));

        int64_t signed_arg = (int64_t) unsigned_arg;

        bool is_negative = flags & FMT_UNSIGNED ? false : (signed_arg < 0);
        uint64_t arg =
            flags & FMT_UNSIGNED
                ? unsigned_arg
                : ((uint64_t) (is_negative ? -signed_arg : signed_arg));

        char *numbuf = NULL;
        size_t numbuf_size = 0;

        do
        {
            const char digit = (arg % 10) + '0';
            casprintf_buffer_push_char(&numbuf, &numbuf_size, digit);
            arg /= 10;
        } while (arg > 0);

        if (is_negative)
            casprintf_buffer_push_char(buffer, buffer_size, '-');

        size_t i = (literal_size != 0 ? literal_size : numbuf_size) - 1;

        if (zero && literal_size > numbuf_size)
        {
            for (size_t zi = 0; zi < (literal_size - numbuf_size); zi++)
                casprintf_buffer_push_char(buffer, buffer_size, '0');
        }

        while (true)
        {
            casprintf_buffer_push_char(buffer, buffer_size, numbuf[i]);

            if (i == 0)
                break;

            i--;
        }

        free(numbuf);
    }
    else if (flags & FMT_STR)
    {
        const char *str = va_arg(*args, const char *);
        casprintf_buffer_concat_str(buffer, buffer_size, str);
    }
}

char *casprintf(const char *format, ...)
{
    char *buffer = NULL;
    size_t buffer_size = 0;
    va_list args;

    va_start(args, format);

    while (*format)
    {
        if (*format == '%')
        {
            format++;

            size_t literal_size = 0;
            bool zero = false;
            const char *old_format = format;
            format_flags_t length_flags =
                casprintf_length_flags(format, &format, &literal_size, &zero);
            format_flags_t type_flag = casprintf_type_flag(*format);

            if (type_flag == FMT_UNKNOWN)
            {
                casprintf_buffer_push_char(&buffer, &buffer_size, '%');

                for (long int i = 0; i < (format - old_format); i++)
                    casprintf_buffer_push_char(
                        &buffer, &buffer_size, old_format[i]);

                continue;
            }

            if (type_flag == 0)
                type_flag = FMT_INT | FMT_DECIMAL;
            else
                format++;

            format_flags_t flags = length_flags | type_flag;

            casprintf_concat(
                &args, &buffer, &buffer_size, flags, literal_size, zero);
            continue;
        }
        else
        {
            casprintf_buffer_push_char(&buffer, &buffer_size, *format);
        }

        format++;
    }

    casprintf_buffer_push_char(&buffer, &buffer_size, 0);
    va_end(args);
    return buffer;
}