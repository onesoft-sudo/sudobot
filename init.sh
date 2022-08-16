#!/bin/sh

mkdir config
mkdir logs
mkdir tmp
mkdir storage

touch logs/join-leave.log
echo "{}" > config/snippets.json
cp sample-config.json config/config.json
