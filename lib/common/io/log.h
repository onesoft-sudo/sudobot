#ifndef SUDOBOT_IO_LOG_H
#define SUDOBOT_IO_LOG_H

#include <concord/log.h>

#ifdef NDEBUG
#undef log_debug
#define log_debug(...) do { (void) NULL; } while (0)
#endif

#endif /* SUDOBOT_IO_LOG_H */