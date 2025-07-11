module.exports = function winratio({ naf_game }) {
 
  // Calculate win ratio per coach by year
  function calculateWinRatioByYear() {
    const winRatioByYearAndCoach = new Map();

    naf_game.forEach(game => {
      // Only include games of variant 1 or 13
      if (game.naf_variantsid === "1" || game.naf_variantsid === "13") {
        const year = new Date(game.date).getFullYear();
        const homeCoachId = game.homecoachid;
        const awayCoachId = game.awaycoachid;

        // Initialize year map if missing
        if (!winRatioByYearAndCoach.has(year)) {
          winRatioByYearAndCoach.set(year, new Map());
        }

        // Update statistics for home coach
        if (homeCoachId) {
          let homeCoachWinRatio = winRatioByYearAndCoach.get(year).get(homeCoachId);
          if (!homeCoachWinRatio) {
            homeCoachWinRatio = { wins: 0, draws: 0, losses: 0, totalGames: 0, rating: 150 };
            winRatioByYearAndCoach.get(year).set(homeCoachId, homeCoachWinRatio);
          }
          if (game.goalshome > game.goalsaway) {
            homeCoachWinRatio.wins++;
          } else if (game.goalshome === game.goalsaway) {
            homeCoachWinRatio.draws++;
          } else {
            homeCoachWinRatio.losses++;
          }
          homeCoachWinRatio.totalGames++;
        }

        // Update statistics for away coach
        if (awayCoachId) {
          let awayCoachWinRatio = winRatioByYearAndCoach.get(year).get(awayCoachId);
          if (!awayCoachWinRatio) {
            awayCoachWinRatio = { wins: 0, draws: 0, losses: 0, totalGames: 0, rating: 150 };
            winRatioByYearAndCoach.get(year).set(awayCoachId, awayCoachWinRatio);
          }
          if (game.goalsaway > game.goalshome) {
            awayCoachWinRatio.wins++;
          } else if (game.goalsaway === game.goalshome) {
            awayCoachWinRatio.draws++;
          } else {
            awayCoachWinRatio.losses++;
          }
          awayCoachWinRatio.totalGames++;
        }
      }
    });

    return winRatioByYearAndCoach;
  }

  // Lookup coach name by NAF number
  function getCoachNameByNafNumber(nafNumber) {
    const coach = CoachExport.find(c => c['NAF Nr'] === nafNumber);
    return coach ? coach['NAF name'] : 'Unknown';
  }

  // Execute calculation
  const winRatioByYearAndCoach = calculateWinRatioByYear();

  // Debug output to verify correctness
  // winRatioByYearAndCoach.forEach((coachMap, year) => {
  //   console.log(`Year: ${year}`);
  //   coachMap.forEach((winRatio, nafNumber) => {
  //     const coachName = getCoachNameByNafNumber(nafNumber);
  //     const totalGames = winRatio.wins + winRatio.draws + winRatio.losses;
  //     const winRatioCalc = ((winRatio.wins + winRatio.draws / 2) / totalGames) * 100;
  //     console.log(`  ${coachName} (NAF Nr: ${nafNumber})`);
  //     console.log(`    Wins: ${winRatio.wins}`);
  //     console.log(`    Draws: ${winRatio.draws}`);
  //     console.log(`    Losses: ${winRatio.losses}`);
  //     console.log(`    Total games: ${totalGames}`);
  //     console.log(`    Win Ratio: ${winRatioCalc.toFixed(2)}`);
  //     console.log(`    Rating: ${winRatio.rating}`);
  //     console.log();
  //   });
  // });

  return winRatioByYearAndCoach;
};