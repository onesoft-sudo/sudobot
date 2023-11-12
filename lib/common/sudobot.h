#ifndef SUDOBOT_SUDOBOT_H
#define SUDOBOT_SUDOBOT_H

#include <stdbool.h>
#include <stdlib.h>
#include <concord/discord.h>
#include "io/log.h"
#include "env/env.h"

#define sudobot_fatal_error(...) do { log_fatal(__VA_ARGS__); exit(EXIT_FAILURE); } while (0)

bool sudobot_start_with_token(const char *token);
bool sudobot_start();

extern struct discord *client;
extern env_t *env;

#endif /* SUDOBOT_SUDOBOT_H */