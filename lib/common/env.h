#ifndef SUDOBOT_ENV_ENV_H
#define SUDOBOT_ENV_ENV_H

struct envtable;

typedef struct env {
    char *filepath;
    struct envtable *table;
    char *error;
    size_t index;
    char *contents;
    size_t length;
    size_t current_line;
} env_t;

env_t *env_init();
bool env_load(env_t *env);
void env_free(env_t *env);
const char *env_get_local(env_t *env, const char *restrict name);
const char *env_get(env_t *env, const char *restrict name);

#endif /* SUDOBOT_ENV_ENV_H */