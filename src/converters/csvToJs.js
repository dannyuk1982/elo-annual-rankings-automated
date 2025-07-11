const fs = require('fs');

/**
 * parseCSV: Splits a CSV string into an array of rows (arrays of values),
 * handling semicolon delimiters and quoted fields.
 * @param {string} csvText
 * @returns {string[][]}
 */
function parseCSV(csvText) {
  const rows = [];
  let row = [];
  let insideQuotes = false;
  let value = '';

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ';' && !insideQuotes) {
      row.push(value.trim());
      value = '';
    } else if (char === '\n' && !insideQuotes) {
      row.push(value.trim());
      rows.push(row);
      row = [];
      value = '';
    } else {
      value += char;
    }

    // Handle end-of-file row push
    if (i === csvText.length - 1) {
      row.push(value.trim());
      rows.push(row);
    }
  }

  return rows;
}

/**
 * convertCsvTextToJsModule: Converts CSV text into a JS module string.
 * @param {string} csvText - Raw CSV content
 * @param {string} moduleName - Desired JS identifier for the export
 * @returns {string} - A JavaScript module exporting the parsed data
 */
function convertCsvTextToJsModule(csvText, moduleName) {
  const lines = parseCSV(csvText);
  if (lines.length === 0) {
    throw new Error('Empty CSV input');
  }

  const headers = lines[0];
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const obj = {};
    const row = lines[i];
    headers.forEach((header, idx) => {
      obj[header] = row[idx] != null ? row[idx] : '';
    });
    data.push(obj);
  }

  // Remove rows where every property is empty
  const filtered = data.filter(obj => Object.values(obj).some(val => val !== ''));

  // Define allowed fields per module
  const fieldWhitelist = {
    naf_game: ['tournamentid','date','naf_variantsid','homecoachid','awaycoachid','goalshome','goalsaway'],
    naf_tournament: ['tournamentid','tournamentmajor'],
    naf_tournamentcoach: ['naftournament','nafcoach'],
    CoachExport: ['NAF Nr','NAF name','Country']
  };
  const allowed = fieldWhitelist[moduleName] || headers;
  const slim = filtered.map(obj => {
    const slimObj = {};
    allowed.forEach(key => { slimObj[key] = obj[key] || ''; });
    return slimObj;
  });

  // Build the JS module: export the parsed array directly
  const json = JSON.stringify(slim, null, 2);
  return `// generated from ${moduleName}.csv\nmodule.exports = ${json};\n`;
}

module.exports = { parseCSV, convertCsvTextToJsModule };
