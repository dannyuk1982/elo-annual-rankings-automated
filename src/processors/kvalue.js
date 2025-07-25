module.exports = function kvalue({ naf_game, naf_tournament, naf_tournamentcoach }) {

  function kvalueByYear() {
    const kvalueYearAndTourney = new Map();
    const naf_tournament_map = new Map(naf_tournament.map(t => [t.id, t]));

    naf_game.forEach(tourney => {
      // Only include games of variant 1 or 13
      if (tourney.naf_variantsid === "1" || tourney.naf_variantsid === "13") {
        const year = tourney.year;
        const tournamentId = tourney.tournamentid;

        // Initialize the map for this year if missing
        if (!kvalueYearAndTourney.has(year)) {
          kvalueYearAndTourney.set(year, new Map());
        }

        // Ensure tournament entry exists and update its data
        if (tournamentId) {
          let tourneyKvalue = kvalueYearAndTourney.get(year).get(tournamentId);
          if (!tourneyKvalue) {
            tourneyKvalue = { major: "No", coaches: 0, minimum: 0, kValue: 0 };
            kvalueYearAndTourney.get(year).set(tournamentId, tourneyKvalue);
          }

          // Count coaches for this tournament
          const coachesCount = naf_tournamentcoach.filter(coach => coach.naftournament === tournamentId).length;
          tourneyKvalue.coaches = coachesCount;

          // Set the 'major' flag based on tournament metadata
          for (const tournament of naf_tournament) {
          if (tournament.tournamentid === tournamentId) {
            tourneyKvalue.major = tournament.tournamentmajor;
          }
    }     

          const playersByTournament = naf_tournamentcoach.filter(coach => coach.naftournament === tournamentId).length;
          const playersByTournamentMin = tourneyKvalue.major === "yes"
            ? Math.min(playersByTournament, 60)
            : Math.min(playersByTournament, 32);
          tourneyKvalue.minimum = playersByTournamentMin;

          // Calcular kValue
          tourneyKvalue.kValue = kValue(playersByTournamentMin);
        }
      }
    });

    return kvalueYearAndTourney;
  }



  // Helper to compute K-factor given the player count
  const kValue = (playersByTournamentMin) => Math.sqrt(playersByTournamentMin) * 2;

  // Run K-value calculation
  const kvalueYearAndTourney = kvalueByYear();

  // (Optional) Debug output of K-values by tournament/year
  //  kvalueYearAndTourney.forEach((tourneyMap, year) => {
  //    console.log(`Year: ${year}`);
  //    tourneyMap.forEach((tourney, tournamentId) => {
  //      console.log(`  Tourney ID: ${tournamentId}`);
  //      console.log(`    Numb. Coaches: ${tourney.coaches}`);
  //      console.log(`    Major?: ${tourney.major}`);
  //      console.log(`    Minimum: ${tourney.minimum}`);
  //      console.log(`    kValue: ${tourney.kValue}`);
  //      console.log();
  //    });
  //  });

  return kvalueYearAndTourney;
};