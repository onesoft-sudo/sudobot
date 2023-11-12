#include <concord/discord.h>
#include <concord/log.h>
#include <stdio.h>
#include <stdbool.h>
#include <string.h>
#include <stdlib.h>
#include <getopt.h>

#include "core/command.h"
#include "events/on_message.h"
#include "events/on_ready.h"
#include "io/printf.h"
#include "sudobot.h"
#include "utils/strutils.h"
#include "flags.h"

#define ENV_BOT_TOKEN "BOT_TOKEN"

static struct option const long_options[] = {
    { "update", no_argument,       NULL, 'u' },
    { "env",    required_argument, NULL, 'e' },
    { 0,        0,                 0,     0  }
};

int main(int argc, char **argv)
{
    int longind = 0;
    const char *shortopts = "ue:";

    opterr = 0;

    while (true) 
    {
        int c = getopt_long(argc, argv, shortopts, long_options, &longind);

        if (c == -1) 
            break;

        switch (c)
        {
            case 'u':
                flags_add(FLAG_UPDATE_COMMANDS);
                log_info("Update of the commands has been queued");
                break;

            case 'e':
                opt_env_file_path = strdup(optarg);
                break;
            
            default:
                if (optopt == 0)
                    log_error("Unknown option -- '%s'", argv[optind]);
                else
                    log_error("Unknown option -- '%c'", optopt);

                exit(EXIT_FAILURE);
                break;
        }
    }

    sudobot_start();
    return 0;
}
