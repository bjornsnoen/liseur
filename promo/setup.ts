import {chmod, access} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import puppeteer from 'puppeteer';
import {directory} from './prepare';

process.env.DISABLE_TELEMETRY = 'true';
process.chdir(directory);
const require = createRequire(import.meta.url);
// npm lifecycle scripts stay off, including Revideo's installation identifier.
for (const pkg of ['@ffmpeg-installer/ffmpeg', '@ffprobe-installer/ffprobe']) {
  if (process.platform !== 'win32') await chmod(require(pkg).path, 0o755);
}
try {
  await access(process.env.PUPPETEER_EXECUTABLE_PATH || await puppeteer.executablePath());
} catch {
  execFileSync(process.execPath, ['node_modules/puppeteer/install.mjs'], {stdio: 'inherit'});
}
