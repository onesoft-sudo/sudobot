#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <fcntl.h>
#include "io.h"

bool io_file_exists(const char *restrict path)
{
    int fd = open(path, O_RDONLY);

    if (fd < 0)
        return false;

    close(fd);
    return true;
}