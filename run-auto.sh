#!/usr/bin/env bash

# Log current date/time, then run with AUTO_CONFIRM
<<<<<<< HEAD
printf "\n\n%s Starting Annual ELO rankings automated run\n\n" "$(date '+%Y-%m-%d %H:%M:%S')" >> /Users/server/elo-automated/run.log
AUTO_CONFIRM=yes /usr/local/bin/node /Users/server/elo-automated/run.js >> /Users/server/elo-automated/run.log 2>&1
=======
printf "\n\n%s Starting Annual ELO rankings automated run\n\n" "$(date '+%Y-%m-%d %H:%M:%S')" >> run.log
AUTO_CONFIRM=yes node run.js >> run.log 2>&1
>>>>>>> 286f0217365c1a0e1b92a5e319cc13646890836d
