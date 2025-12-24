module.exports = function ratingByYearAndCoach({ naf_game, winRatioByYearAndCoach, kvalueYearAndTourney, CoachExport }) {

  // Build lookup map of coach metadata (country & name) by NAF number
  function getCoachInfoMap() {
    const coachInfoMap = new Map();
    CoachExport.forEach(coach => {
      if (!coach["NAF Nr"]) {
        console.error(`Missing NAF Nr for coach: ${coach}`);
        return;
      }
      let country = coach.Country || "Undefined"; // Manejar países no definidos
      if (country === "United States of America") {
        country = "USA";
      }
      coachInfoMap.set(coach["NAF Nr"], {
        country: country,
        name: coach["NAF name"] || "Unknown" // Manejar nombres no definidos
      });
    });
    return coachInfoMap;
  }

  // Core Elo-rating update loop: seed from win ratios and replay each game
  function ratingByYearAndCoach() {
    const ratingYearAndCoach = new Map(winRatioByYearAndCoach);
    const kvalueYearTourney = new Map(kvalueYearAndTourney);
    const coachInfoMap = getCoachInfoMap(); // Retrieve coach metadata map

    naf_game.forEach(game => {
      if (game.naf_variantsid === "1" || game.naf_variantsid === "13" || game.naf_variantsid === "15") {
        const coachHomeId = game.homecoachid;
        const coachAwayId = game.awaycoachid;
        const year = game.year;

        let yearMap = ratingYearAndCoach.get(year);
  if (!yearMap) {
    console.error(`Year map not found for year: ${year}`);
    yearMap = new Map(); // Initialize empty year map if missing
  }

        const ratingHome = yearMap.get(coachHomeId).rating;
        const ratingAway = yearMap.get(coachAwayId).rating;

    // Save previous ratings for optional debugging
    const prevHome = ratingHome;
    const prevAway = ratingAway;

        const differenceRatingHome = (ratingAway - ratingHome) / 150;
        const differenceRatingAway = (ratingHome - ratingAway) / 150;

        const winProbabilityHome = 1 / (1 + Math.pow(10, differenceRatingHome));
        const winProbabilityAway = 1 / (1 + Math.pow(10, differenceRatingAway));

        let scoringPointsHome, scoringPointsAway;
        if (game.goalshome > game.goalsaway) {
          scoringPointsHome = 1;
          scoringPointsAway = 0;
        } else if (game.goalshome < game.goalsaway) {
          scoringPointsHome = 0;
          scoringPointsAway = 1;
        } else {
          scoringPointsHome = 0.5;
          scoringPointsAway = 0.5;
        }

        const kValue = kvalueYearTourney.get(year).get(game.tournamentid);

        const newRatingHome = ratingHome + (kValue.kValue * (scoringPointsHome - winProbabilityHome));
        const newRatingAway = ratingAway + (kValue.kValue * (scoringPointsAway - winProbabilityAway));

        const coachHomeInfo = coachInfoMap.get(coachHomeId);
        const coachAwayInfo = coachInfoMap.get(coachAwayId);
        
        if (!coachHomeInfo || !coachAwayInfo) {
          // console.error(`Coach information missing for Home ID: ${coachHomeId} or Away ID: ${coachAwayId}`);
          return; // Sal de la iteración si falta la información
        }
        

        // Calculate updated win ratio for home coach
        const homeWinRatio = ((yearMap.get(coachHomeId).wins + yearMap.get(coachHomeId).draws / 2) / yearMap.get(coachHomeId).totalGames) * 100;
        
        // Update home coach entry with new rating, win ratio, and metadata
        yearMap.set(coachHomeId, {
          rating: newRatingHome,
          wins: yearMap.get(coachHomeId).wins,
          draws: yearMap.get(coachHomeId).draws,
          losses: yearMap.get(coachHomeId).losses,
          totalGames: yearMap.get(coachHomeId).totalGames,
          country: coachHomeInfo.country,
          name: coachHomeInfo.name,
          winRatio: homeWinRatio.toFixed(2)
        });

        // Calculate updated win ratio for away coach
        const awayWinRatio = ((yearMap.get(coachAwayId).wins + yearMap.get(coachAwayId).draws / 2) / yearMap.get(coachAwayId).totalGames) * 100;

        // Update away coach entry with new rating, win ratio, and metadata
        yearMap.set(coachAwayId, {
          rating: newRatingAway,
          wins: yearMap.get(coachAwayId).wins,
          draws: yearMap.get(coachAwayId).draws,
          losses: yearMap.get(coachAwayId).losses,
          totalGames: yearMap.get(coachAwayId).totalGames,
          country: coachAwayInfo.country,
          name: coachAwayInfo.name,
          winRatio: awayWinRatio.toFixed(2)
        });

        ratingYearAndCoach.set(year, yearMap);
        
// // DEBUG output for NAF #68 only
// if (coachHomeId === '68' || coachAwayId === '68') {
//   const isHome = coachHomeId === '68';
//   const prev = isHome ? prevHome : prevAway;
//   const curr = isHome ? newRatingHome : newRatingAway;
//   const prob = isHome ? winProbabilityHome : winProbabilityAway;
//   const score = isHome ? scoringPointsHome : scoringPointsAway;
//   console.log(
//     `[DEBUG68] ${game.date} TournamentID:${game.tournamentid}` +
//     ` Coach:68@ELO ${prev.toFixed(4)}→${curr.toFixed(4)}` +
//     ` K=${kValue.kValue.toFixed(4)} ProbWin=${prob.toFixed(4)}` +
//     ` Score=${score}`
//   );
// }
      }
    });

    return ratingYearAndCoach;
  }

  // Execute the rating update loop
  const modifiedRatingYearAndCoach = ratingByYearAndCoach();


  // (Optional) Summary debug output block
  // console.log("\nResumen final de ratings por año y entrenador:");
  // modifiedRatingYearAndCoach.forEach((coachMap, year) => {
  //   console.log(`\nAño: ${year}`);
  //   coachMap.forEach((coachData, nafNumber) => {
  //     console.log(`  ${coachData.name} (NAF: ${nafNumber}, ${coachData.country})`);
  //     console.log(`    Wins: ${coachData.wins}`);
  //     console.log(`    Draws: ${coachData.draws}`);
  //     console.log(`    Losses: ${coachData.losses}`);
  //     console.log(`    Total Games: ${coachData.totalGames}`);
  //     console.log(`    Win Ratio: ${coachData.winRatio}%`); // Ya está calculado
  //     console.log(`    Rating: ${coachData.rating.toFixed(2)}`);
  //   });
  // });


  return modifiedRatingYearAndCoach;
};