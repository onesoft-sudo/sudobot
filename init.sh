#!/bin/sh

mkdir -p config
mkdir -p logs
mkdir -p tmp 
mkdir -p storage

touch logs/join-leave.log
echo "{}" > config/snippets.json
cp sample-config.json config/config.json
