module.exports = function position({ nafCoachCountByYearData, modifiedRatingYearAndCoach }) {

  // Helper to capitalize the first letter of each word in a string
  function capitalizeWords(str) {
    return str
      .toLowerCase() // convert entire string to lowercase
      .replace(/\b\w/g, char => char.toUpperCase()); // capitalize the first letter of each word
  }

  // Calculate overall and per-country positions by year
  function calculatePositions(ratingYearAndCoach, nafCoachCountByYear) {
    const positionByYear = new Map();

    ratingYearAndCoach.forEach((coachMap, year) => {
      // Convert coachMap (Map) into an array for sorting
      let coachesArray = Array.from(coachMap.entries()).map(([nafNumber, coachData]) => {
        // Fetch tournaments played count for this coach in the given year
        const tournamentsPlayed = nafCoachCountByYear.get(year)?.get(nafNumber) || 0;

        return {
          nafNumber,
          ...coachData,
          tournamentsPlayed
        };
      });

      // Sort by rating (desc), then winRatio (desc), then totalGames (asc)
      coachesArray.sort((a, b) => {
        if (b.rating !== a.rating) {
          return b.rating - a.rating; // descending by rating
        } else if (b.winRatio !== a.winRatio) {
          return b.winRatio - a.winRatio; // descending by win ratio
        } else {
          return a.totalGames - b.totalGames; // ascending by totalGames
        }
      });

      // Assign overall positions
      coachesArray.forEach((coach, index) => {
        coach.position = index + 1;
      });

      // Group by country and assign country-specific positions
      const countryGroups = new Map();
      coachesArray.forEach(coach => {
        if (!countryGroups.has(coach.country)) {
          countryGroups.set(coach.country, []);
        }
        countryGroups.get(coach.country).push(coach);
      });

      countryGroups.forEach(coachGroup => {
        coachGroup.sort((a, b) => b.rating - a.rating);
        coachGroup.forEach((coach, index) => {
          coach.positionCountry = index + 1;
        });
      });

      // Re-sort by overall position for final ordering
      coachesArray.sort((a, b) => a.position - b.position);
      positionByYear.set(year, coachesArray);
    });

    return positionByYear;
  }

  // Execute position calculation
  const positionByYear = calculatePositions(modifiedRatingYearAndCoach, nafCoachCountByYearData);

  // Flatten the results into a final array
  const finalDataArray = [];
  positionByYear.forEach((coachesArray, year) => {
    coachesArray.forEach(coach => {
      finalDataArray.push({
        year: year,
        nafNumber: coach.nafNumber,
        name: coach.name,
        country: coach.country
            ? coach.country.toLowerCase().replace(/\b\w/g, char => char.toUpperCase())
            : 'Undefined',
        rating: coach.rating,
        wins: coach.wins,
        draws: coach.draws,
        losses: coach.losses,
        totalGames: coach.totalGames,
        tournamentsPlayed: coach.tournamentsPlayed,
        winRatio: coach.winRatio,
        position: coach.position,
        positionCountry: coach.positionCountry
      });
    });
  });

  return finalDataArray;
};