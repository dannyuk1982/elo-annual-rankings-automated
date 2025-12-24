#!/usr/bin/env bash

# Log current date/time, then run with AUTO_CONFIRM
printf "\n\n%s Starting Annual ELO rankings automated run\n\n" "$(date '+%Y-%m-%d %H:%M:%S')" >> /Users/server/elo-automated/run.log
AUTO_CONFIRM=yes /usr/local/bin/node /Users/server/elo-automated/run.js >> /Users/server/elo-automated/run.log 2>&1