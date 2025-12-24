module.exports = function tournamentCount({ naf_tournamentcoach, naf_game, CoachExport }) {

  // Count tournament appearances for each coach, grouped by year
  function countNafCoachAppearances() {
    const nafCoachCountByYearData = new Map();

    naf_tournamentcoach.forEach(tc => {
      // Find the corresponding game record to get its date
      const game = naf_game.find(g => g.tournamentid === tc.naftournament);

      // Only include games of variant 1 or 13
      if (game && (game.naf_variantsid === "1" || game.naf_variantsid === "13" || game.naf_variantsid === "15")) {
        const year = game.year;
        const nafCoach = tc.nafcoach;

        // Initialize the map for this year if absent
        if (!nafCoachCountByYearData.has(year)) {
          nafCoachCountByYearData.set(year, new Map());
        }

        // Increment this coach's tournament count for the year
        const coachMap = nafCoachCountByYearData.get(year);
        if (!coachMap.has(nafCoach)) {
          coachMap.set(nafCoach, 0);
        }
        coachMap.set(nafCoach, coachMap.get(nafCoach) + 1);
      }
    });

    return nafCoachCountByYearData;
  }

  // Lookup a coach's display name by their NAF number
  function getCoachNameByNafNumber(nafNumber) {
    const coach = CoachExport.find(c => c['NAF Nr'] === nafNumber);
    return coach ? coach['NAF name'] : 'Unknown';
  }

  // Execute the counting function
  const nafCoachCountByYearData = countNafCoachAppearances();

  // nafCoachCountByYearData.forEach((coachMap, year) => {
  //   console.log(`Year: ${year}`);
  //   coachMap.forEach((countTournaments, nafNumber) => {
  //     const coachName = getCoachNameByNafNumber(nafNumber);
  //     console.log(`  ${coachName} (NAF Nr: ${nafNumber}): Tournaments: ${countTournaments}`);
  //   });
  //   console.log();
  // });

  return nafCoachCountByYearData;

}