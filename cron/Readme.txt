crontab -e

Then make sure this line is in there:

0 4 * * 1 /Users/server/elo-automated/run-auto.sh


Breakdown:
0 → minute (:00)
4 → hour (5am)
* * → every day, every month
1 → Monday (0 = Sunday, 1 = Monday, … 6 = Saturday)