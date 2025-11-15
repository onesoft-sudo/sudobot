#!/bin/sh
#
# This script is used to start the docker container.
#
# Copyright (C) 2025  OSN Developers.
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

. ./test-container.sh

if [ $? -ne 0 ]; then
    exit 1
fi

if [ ! -f /app/.migration_status ] || [ -z \"$(cat /app/.migration_status)\" ]; then
    node scripts/migrate.js
fi

npm start -- "$@"
