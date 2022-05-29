#!/bin/bash

cmd="npm start"

for a in $@; do
    if [[ $a == '--dev' ]]; then
        cmd="npm run dev"
    fi
done
 
while true; do
command $cmd
sleep 2;
done