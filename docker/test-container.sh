#!/bin/sh
#
# This script is used to test the docker container.
# 
# Copyright (C) 2024  OSN Developers.
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.
#
# Authors: Ar Rakin
#

# Since this script runs inside the container before execution,
# we can run necessary commands to test the container.

me=$(basename "$0")

fail() {
    echo "$me: test failed: $1" >&2
    exit 1
}

cd /app || {
    echo "$me: failed to change directory to /app" >&2
    exit 1
}

if [ ! -f package.json ]; then
    fail "package.json is missing"
fi

if [ ! -f .env ]; then
    fail ".env file is missing"
fi

if [ ! -d storage ]; then
    fail "storage directory is missing"
fi

if [ ! -f ./storage/config/config.json ] || [ ! -f ./storage/config/system.json ]; then
    fail "config files are missing"
fi

if [ ! -d node_modules ]; then
    fail "node_modules directory is missing"
fi

if [ ! -f tsconfig.json ]; then
    fail "tsconfig.json is missing"
fi

if [ ! -d scripts ]; then 
    fail "scripts directory is missing"
fi

if [ ! -f scripts/migrate.js ]; then 
    fail "migrate.js is missing"
fi

echo "$me: all tests passed"
exit 0