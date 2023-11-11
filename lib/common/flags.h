#ifndef SUDOBOT_FLAGS_H
#define SUDOBOT_FLAGS_H

#include <stdbool.h>

enum sudobot_flags
{
    FLAG_UPDATE_COMMANDS = 1
};

void flags_add(int flag);
void flags_remove(int flag);
void flags_set(int new_flags);
void flags_clear();
int flags_get();
bool flags_has(int flag);

#endif /* SUDOBOT_FLAGS_H */