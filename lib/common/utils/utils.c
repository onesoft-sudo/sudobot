#include <errno.h>
#include <string.h>
#include "utils.h"

const char *get_last_error()
{
    return strerror(errno);
}