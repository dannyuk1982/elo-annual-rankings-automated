#!/usr/bin/env node
require('dotenv').config();

const fs          = require('fs');
const path        = require('path');
const https       = require('https');
const unzipper    = require('unzipper');
const readline    = require('readline');
const cliProgress = require('cli-progress');
const ftp         = require('basic-ftp');
const { convertCsvTextToJsModule } = require('./src/converters/csvToJs');

// Paths & config
const ZIP_URL   = process.env.ZIP_URL;
const TEMP_DIR  = path.resolve(__dirname, 'temp');
const EXPORTS   = path.resolve(__dirname, 'exports');
const CACHE_DIR = path.resolve(__dirname, 'cache');
const ZIP_PATH  = path.join(CACHE_DIR, 'nafstat.zip');
const FINAL_JS  = path.join(EXPORTS, 'finalData.js');

const FTP_HOST     = process.env.FTP_HOST;
const FTP_USER     = process.env.FTP_USER;
const FTP_PASSWORD = process.env.FTP_PASSWORD;
const FTP_DIR      = process.env.FTP_REMOTE_DIR || '/';

// Prompt helper
function ask(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, ans => { rl.close(); resolve(ans.trim()); });
  });
}

// Download ZIP with progress
async function downloadZipWithProgress(url, destPath) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const total = parseInt(res.headers['content-length'] || '0', 10);
      const bar = new cliProgress.SingleBar(
        { format: '   downloading |{bar}| {value}/{total} bytes', hideCursor: true },
        cliProgress.Presets.shades_classic
      );
      bar.start(total, 0);
      const out = fs.createWriteStream(destPath);
      res.on('data', chunk => bar.increment(chunk.length));
      res.pipe(out);
      out.on('finish', () => { bar.stop(); resolve(); });
      out.on('error', err => { bar.stop(); reject(err); });
    }).on('error', reject);
  });
}

// Extract CSVs into TEMP_DIR with progress
async function extractCsvsFromZip(zipPath, extractDir) {
  const directory = await unzipper.Open.file(zipPath);
  const entries  = directory.files.filter(f => f.path.endsWith('.csv'));
  const bar      = new cliProgress.SingleBar(
    { format: '   extracting |{bar}| {value}/{total} files', hideCursor: true },
    cliProgress.Presets.shades_classic
  );
  bar.start(entries.length, 0);
  await Promise.all(entries.map(entry => new Promise((res, rej) => {
    entry.stream()
      .pipe(fs.createWriteStream(path.join(extractDir, path.basename(entry.path))))
      .on('finish', () => { bar.increment(); res(); })
      .on('error', rej);
  })));
  bar.stop();
  return entries.map(e => path.basename(e.path));
}

// Upload finalData.js via FTP
async function uploadToFtp(localPath) {
  const client = new ftp.Client();
  client.ftp.verbose = false;
  try {
    await client.access({ host: FTP_HOST, user: FTP_USER, password: FTP_PASSWORD, secure: false });
    await client.ensureDir(FTP_DIR);
    await client.uploadFrom(localPath, path.basename(localPath));
    console.log(`✅ Uploaded ${path.basename(localPath)} to FTP:${FTP_DIR}`);
  } catch (err) {
    console.error('❌ FTP upload failed:', err);
    process.exit(1);
  } finally {
    client.close();
  }
}

async function main() {
  // 0) Check for existing finalData.js
  let doProcess = true;
  if (fs.existsSync(FINAL_JS)) {
    const ans = await ask(`Found existing ${FINAL_JS}. Recalculate? (Y/n): `);
    // Skip only if explicit no
    if (/^n(o)?$/i.test(ans)) {
      console.log('ℹ️  Skipping processing.');
      doProcess = false;
    }
  }

  // 1) Ensure cache & exports dirs exist
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  if (!fs.existsSync(EXPORTS))   fs.mkdirSync(EXPORTS, { recursive: true });

  if (doProcess) {
    // Clear out files in TEMP_DIR but keep the directory
    if (fs.existsSync(TEMP_DIR)) {
      fs.readdirSync(TEMP_DIR).forEach(file => {
        fs.rmSync(path.join(TEMP_DIR, file), { recursive: true, force: true });
      });
    } else {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    // 2) Download ZIP with cache prompt
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    let doDownload = true;
    if (fs.existsSync(ZIP_PATH)) {
      const ans = await ask(`Found cached ZIP at ${ZIP_PATH}. Redownload? (y/N): `);
      if (!/^y(es)?$/i.test(ans)) { doDownload = false; console.log('📦 Using cached ZIP.'); }
    }
    if (doDownload) {
      console.log(`⬇️  Downloading ZIP from ${ZIP_URL}...`);
      const t0 = Date.now();
      await downloadZipWithProgress(ZIP_URL, ZIP_PATH);
      console.log(`✅ ZIP cached (${((Date.now() - t0) / 1000).toFixed(2)}s)`);
    }

    // 3) Extract CSVs into TEMP
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    console.log('🔄 Extracting CSVs into temp:');
    const tExtract = Date.now();
    let csvFiles = await extractCsvsFromZip(ZIP_PATH, TEMP_DIR);
    console.log(`✅ Extracted ${csvFiles.length} CSVs in ${((Date.now()-tExtract)/1000).toFixed(2)}s`);

    // Keep only the required CSVs and delete the rest
    const required = new Set(['naf_game.csv','naf_tournament.csv','naf_tournamentcoach.csv','CoachExport.csv']);
    csvFiles.forEach(file => {
      if (!required.has(file)) {
        // delete unwanted CSV
        fs.unlinkSync(path.join(TEMP_DIR, file));
      }
    });
    // Filter list to only required files
    csvFiles = csvFiles.filter(f => required.has(f));

    // 4) Convert CSV→JS modules in temp
    console.log('🔄 Converting CSVs to JS modules in temp:');
    const tConv = Date.now();
    const convBar = new cliProgress.SingleBar(
      { format: '   converting |{bar}| {value}/{total} files', hideCursor: true },
      cliProgress.Presets.shades_classic
    );
    convBar.start(csvFiles.length, 0);
    csvFiles.forEach((f, i) => {
      const raw = fs.readFileSync(path.join(TEMP_DIR, f), 'utf8');
      const name = path.basename(f, '.csv');
      fs.writeFileSync(path.join(TEMP_DIR, `${name}.js`), convertCsvTextToJsModule(raw, name));
      convBar.update(i+1);
    });
    convBar.stop();
    console.log(`✅ Converted in ${((Date.now()-tConv)/1000).toFixed(2)}s`);

    // 5) Load raw data modules
    console.log('▶️  Loading data modules...');
    const naf_game            = require(path.join(TEMP_DIR, 'naf_game.js'));
    const naf_tournament      = require(path.join(TEMP_DIR, 'naf_tournament.js'));
    const naf_tournamentcoach = require(path.join(TEMP_DIR, 'naf_tournamentcoach.js'));
    const CoachExport         = require(path.join(TEMP_DIR, 'CoachExport.js'));

    // 6) Run processors
    console.log('⚙️  Running processors:');
    const results = {};
    const tAll = Date.now();

    // tournamentCount
    console.log('   ▶️ Starting tournamentCount…');
    let tStep = Date.now();
    results.nafCoachCountByYearData = require('./src/processors/tournamentCount')({
      naf_tournamentcoach,
      naf_game,
      CoachExport
    });
    console.log(`   • tournamentCount took ${((Date.now()-tStep)/1000).toFixed(2)}s`);

    // winratio
    console.log('   ▶️  Starting winratio…');
    tStep = Date.now();
    results.winRatioByYearAndCoach = require('./src/processors/winratio')({
      naf_game,
      CoachExport
    });
    console.log(`   • winratio took ${((Date.now() - tStep)/1000).toFixed(2)}s`);

    // kvalue
    console.log('   ▶️  Starting kvalue…');
    tStep = Date.now();
    results.kvalueYearAndTourney = require('./src/processors/kvalue')({
      naf_game,
      naf_tournament,
      naf_tournamentcoach
    });
    console.log(`   • kvalue took ${((Date.now() - tStep)/1000).toFixed(2)}s`);

    // rating
    console.log('   ▶️  Starting rating…');
    tStep = Date.now();
    results.modifiedRatingYearAndCoach = require('./src/processors/rating')({
      naf_game, // pass game data
      winRatioByYearAndCoach: results.winRatioByYearAndCoach, // precomputed win ratios
      kvalueYearAndTourney:   results.kvalueYearAndTourney, // precomputed k-values
      CoachExport // coach metadata
    });
    console.log(`   • rating took ${((Date.now() - tStep)/1000).toFixed(2)}s`);

    // position 
    console.log('   ▶️  Starting position…');
    tStep = Date.now();
    const finalDataArray = require('./src/processors/position')({
      nafCoachCountByYearData: results.nafCoachCountByYearData,
      modifiedRatingYearAndCoach: results.modifiedRatingYearAndCoach
    });
    console.log(`   • position took ${((Date.now() - tStep)/1000).toFixed(2)}s`);

    console.log(`✅ All processors done in ${((Date.now()-tAll)/1000).toFixed(2)}s`);

    // 7) Write finalData.js
    console.log('💾 Writing finalData.js:');
    const tW = Date.now();
    fs.writeFileSync(FINAL_JS, `const finalData = ${JSON.stringify(finalDataArray, null, 2)};\n`);
    console.log(`✅ Written in ${((Date.now()-tW)/1000).toFixed(2)}s`);

    // 8) Cleanup
    console.log('🧹 Cleaning up temp:');
    const tC = Date.now();
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    console.log(`✅ Temp cleared in ${((Date.now()-tC)/1000).toFixed(2)}s`);
  }

  // 9) Upload via FTP
  const uploadAns = await ask('Upload finalData.js via FTP? (Y/n): ');
  if (!/^n(o)?$/i.test(uploadAns)) {
    console.log('🚀 Uploading finalData.js to FTP:');
    const tU = Date.now();
    await uploadToFtp(FINAL_JS);
    console.log(`✅ FTP upload done in ${((Date.now()-tU)/1000).toFixed(2)}s`);
  } else {
    console.log('ℹ️  Skipping FTP upload.');
  }

  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});