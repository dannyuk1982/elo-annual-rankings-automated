#!/usr/bin/env bash

# Log current date/time, then run with AUTO_CONFIRM
printf "\n\n%s Starting Annual ELO rankings automated run\n\n" "$(date '+%Y-%m-%d %H:%M:%S')" >> run.log
AUTO_CONFIRM=yes node run.js >> run.log 2>&1