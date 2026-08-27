// Offline frame grabber for the koi hero.
//
// Runs the page headed so it gets the real GPU, drives window.__captureTime
// one frame at a time so spacing is exact, and writes PNGs for ffmpeg.
//
//   node capture/grab.mjs --w 1280 --h 720 --dpr 3 --fps 30 --secs 24 --out frames/land
import { createRequire } from 'module';
import { mkdir, rm } from 'fs/promises';
const require = createRequire('/Users/praneelkhiantani/nano-hero/package.json');
const { chromium } = require('playwright');

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > -1 ? process.argv[i + 1] : d;
};

const W = +arg('w', 1280);
const H = +arg('h', 720);
const DPR = +arg('dpr', 3);
const FPS = +arg('fps', 30);
const SECS = +arg('secs', 24);
const OUT = arg('out', 'frames/land');
const WARM = +arg('warm', 6000);
const PORT = arg('port', '4173');
const CAMZ = arg('camz', '');

const total = Math.round(FPS * SECS);
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: false,
  args: [
    '--hide-scrollbars',
    '--force-device-scale-factor=' + DPR,
    '--enable-gpu',
    '--use-angle=metal',
  ],
});
const page = await browser.newPage({
  viewport: { width: W, height: H },
  deviceScaleFactor: DPR,
});
page.on('pageerror', (e) => console.error('PAGEERROR', e.message.slice(0, 200)));
// big canvases take a while to serialise; the default 30s is not enough
page.setDefaultTimeout(120000);

const url =
  `http://localhost:${PORT}/?capture=1` + (CAMZ ? `&camz=${CAMZ}` : '');
await page.goto(url, { waitUntil: 'load' });
// let fonts, geometry and the first shader compiles settle
await page.waitForTimeout(WARM);

const t0 = Date.now();
for (let i = 0; i < total; i++) {
  await page.evaluate((t) => {
    window.__captureTime = t;
  }, i / FPS);
  // wait for the page to confirm it rendered this exact timestamp
  await page.waitForFunction(
    (t) => window.__renderedTime === t,
    i / FPS,
    { timeout: 20000, polling: 'raf' }
  );
  const file = `${OUT}/f${String(i).padStart(5, '0')}.png`;
  try {
    await page.screenshot({ path: file, timeout: 120000, optimizeForSpeed: true });
  } catch (err) {
    // one retry: a single slow serialise shouldn't kill a 10-minute run
    console.error(`frame ${i} retry after: ${err.message.slice(0, 80)}`);
    await page.screenshot({ path: file, timeout: 120000 });
  }
  if (i % 30 === 0 || i === total - 1) {
    const per = (Date.now() - t0) / (i + 1);
    const left = Math.round((per * (total - i - 1)) / 1000);
    console.log(
      `${i + 1}/${total}  ${per.toFixed(0)}ms/frame  ~${left}s left`
    );
  }
}
await browser.close();
console.log(`done: ${total} frames in ${OUT}`);
