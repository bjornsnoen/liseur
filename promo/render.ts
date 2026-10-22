import {renderVideo} from '@revideo/renderer';
import {access, cp, mkdir, rename} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {execFileSync, spawnSync} from 'node:child_process';
import {homedir} from 'node:os';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import puppeteer from 'puppeteer';
import {prepare, directory} from './prepare';
import {BEATS, FADE} from './src/theme';

process.env.DISABLE_TELEMETRY = 'true';
process.chdir(directory);
const args = new Set(process.argv.slice(2));
for (const arg of args) {
  if (!['--stills', '--silent'].includes(arg)) throw new Error(`Unknown argument: ${arg}`);
}
const music = await prepare();
if (!music && !args.has('--silent')) {
  throw new Error('Add a licensed music track at promo/assets/music.{mp3,wav,m4a,ogg,flac}, or pass --silent for a review copy.');
}
const stills = args.has('--stills');
const screenshots = [
  '02-reading', '11-reading-dark', '28-reading-sepia', '24-read-aloud',
  '27-translation-original', '27-translation', '25-companion-profile',
  '26-codex-relationships', '01-library', '13-series', '22-widgets-light', '18-stats',
];
for (const name of screenshots) await access(`public/screenshots/${name}.png`);
if (!stills) {
  for (const name of ['reading-light', 'reading-sepia', 'reading-dark', 'read-aloud', 'library']) {
    try { await access(`public/clips/${name}.mp4`); }
    catch { throw new Error(`Missing ${name}.mp4. Run make promo-clips, or pass --stills.`); }
  }
}
const outDir = resolve(directory, '../build/promo');
await mkdir(outDir, {recursive: true});
const rendered = await renderVideo({
  projectFile: './src/project.ts', variables: {stills},
  settings: {
    outDir: resolve(directory, 'output'), outFile: 'picture.mp4', workers: 1, logProgress: true,
    puppeteer: {executablePath: process.env.PUPPETEER_EXECUTABLE_PATH},
    viteConfig: {
      server: {host: '127.0.0.1'},
      // Prebundle the renderer with scenes to keep a single thread context.
      optimizeDeps: {include: ['@revideo/core', '@revideo/2d', '@revideo/2d/lib/jsx-dev-runtime', '@revideo/renderer/lib/client/render']},
    },
  },
});
const require = createRequire(import.meta.url);
const ffmpeg = require('@ffmpeg-installer/ffmpeg').path;
const output = resolve(outDir, 'liseur-promo.mp4');
const temporary = resolve(outDir, 'finished.mp4');
const seconds = BEATS.at(-1)!;
const withMusic = music && !args.has('--silent');
let audio = ['-map', '0:v:0', '-an'];
if (withMusic) {
  // One linear gain toward -16 LUFS, capped so true peaks stay under -1.5 dBTP; the track keeps its dynamics.
  const pass = spawnSync(ffmpeg, ['-hide_banner', '-nostats', '-i', music, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], {encoding: 'utf8'});
  if (pass.status !== 0) throw new Error(`Could not measure the music loudness:\n${pass.stderr}`);
  const measured = JSON.parse(pass.stderr.slice(pass.stderr.lastIndexOf('{')));
  const gain = Math.min(-16 - Number(measured.input_i), -1.5 - Number(measured.input_tp));
  audio = ['-i', music, '-map', '0:v:0', '-map', '1:a:0', '-c:a', 'aac', '-b:a', '192k', '-af',
    `aformat=sample_rates=48000:channel_layouts=stereo,volume=${gain.toFixed(2)}dB,apad,`
    + `afade=t=in:d=0.05,afade=t=out:st=${FADE}:d=${(seconds - FADE).toFixed(3)}:curve=hsin`];
}

execFileSync(ffmpeg, ['-y', '-v', 'error', '-i', rendered, ...audio,
  '-c:v', 'copy', '-t', String(seconds), '-movflags', '+faststart', temporary], {stdio: 'inherit'});
await rename(temporary, output);
const contact = resolve(outDir, 'liseur-promo-contact-sheet.jpg');
const frames = BEATS.slice(0, -1).map((time, index) => Math.round(Math.min(time + (BEATS[index + 1] - time) * 0.7, FADE - 0.3) * 30));
execFileSync(ffmpeg, ['-y', '-v', 'error', '-i', output, '-vf',
  `select='${frames.map(frame => `eq(n,${frame})`).join('+')}',scale=480:270,tile=4x2:padding=8:margin=8:color=0xF0DFCA`,
  '-frames:v', '1', contact], {stdio: 'inherit'});
const thumbnail = resolve(outDir, 'liseur-promo-thumbnail.jpg');
const browser = await puppeteer.launch({
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH, args: ['--allow-file-access-from-files'],
});
try {
  const page = await browser.newPage();
  await page.setViewport({width: 1280, height: 720});
  await page.goto(pathToFileURL(resolve(directory, 'thumbnail.html')).href, {waitUntil: 'networkidle0'});
  await page.evaluate('document.fonts.ready');
  await page.screenshot({path: thumbnail, type: 'jpeg', quality: 92});
} finally {
  await browser.close();
}
const review = resolve(homedir(), 'tmp/liseur');
await mkdir(review, {recursive: true});
for (const file of [output, contact, thumbnail]) await cp(file, resolve(review, file.split('/').at(-1)!));
console.log(`Rendered ${seconds}s ${stills ? 'stills' : 'live'} ${withMusic ? 'with music' : 'silent review'}: ${output}`);
console.log(`Review copy, contact sheet and thumbnail: ${review}`);
