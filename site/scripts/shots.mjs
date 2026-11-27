import { createServer } from 'node:http';
import { mkdir, readFile, readdir, rm, stat } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import { chromium } from 'playwright';

const siteRoot = resolve(new URL('..', import.meta.url).pathname);
const dist = join(siteRoot, 'dist');
const shots = join(siteRoot, '.shots');
const widths = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
];

async function walk(dir) {
  const out = [];
  for (const name of await readdir(dir)) {
    const full = join(dir, name);
    if ((await stat(full)).isDirectory()) out.push(...(await walk(full)));
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}

function pageName(file) {
  const rel = relative(dist, file).split(sep).join('/');
  if (rel === 'index.html') return 'home';
  if (rel.endsWith('/index.html')) return rel.slice(0, -'/index.html'.length);
  return rel.slice(0, -'.html'.length);
}

function pagePath(file) {
  const rel = relative(dist, file).split(sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel}`;
}

function rgbChannels(value) {
  const match = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(value);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

function hexChannels(hex) {
  return [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
}

function luminance(channels) {
  const [r, g, b] = channels.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a, b) {
  const high = Math.max(luminance(a), luminance(b));
  const low = Math.min(luminance(a), luminance(b));
  return (high + 0.05) / (low + 0.05);
}

function sameChannels(a, b) {
  return a && b && a.every((channel, index) => channel === b[index]);
}

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://local').pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = resolve(dist, `.${pathname}`);
    if (!file.startsWith(dist + sep) && file !== dist) throw new Error('outside dist');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
});

await rm(shots, { recursive: true, force: true });

let browser;
let consoleErrors = 0;
let failedRequests = 0;
let pageCount = 0;
const themeProblems = [];
const themePaint = new Map();

try {
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  try {
    browser = await chromium.launch({ channel: 'chrome' });
  } catch {
    browser = await chromium.launch();
  }

  const files = (await walk(dist)).sort();
  pageCount = files.length;

  for (const file of files) {
    const name = pageName(file);
    const url = base + pagePath(file);
    for (const size of widths) {
      const page = await browser.newPage({ viewport: { width: size.width, height: size.height } });
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors += 1;
      });
      page.on('pageerror', () => {
        consoleErrors += 1;
      });
      page.on('requestfailed', () => {
        failedRequests += 1;
      });
      page.on('response', (response) => {
        if (response.status() >= 400) failedRequests += 1;
      });
      await page.goto(url, { waitUntil: 'networkidle' });
      // A lazy picture loads only once it is scrolled to. A shot taken before that shows an
      // empty frame and proves nothing (the third Rich Life phone, Nov 18 2026).
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 400) {
          window.scrollTo(0, y);
          await new Promise((ok) => setTimeout(ok, 100));
        }
        window.scrollTo(0, 0);
      });
      await page
        .waitForFunction(() => [...document.images].every((img) => img.offsetParent === null || (img.complete && img.naturalWidth > 0)), null, { timeout: 15000 })
        .catch(() => {
          throw new Error(`${name}: a visible picture did not load at ${size.width}`);
        });
      const target = join(shots, String(size.width), `${name}.png`);
      await mkdir(join(target, '..'), { recursive: true });
      await page.screenshot({ path: target, fullPage: true });
      if (name === 'home') {
        const since = (await page.locator('#since').textContent()) ?? '';
        if (!/^Since [A-Z][a-z]+ \d+ it has looked at \d+ stocks?, refused \d+ orders? and made \d+ trades?\.$/.test(since)) {
          throw new Error(`home: Blackfin sentence was not built from the data: ${since}`);
        }
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        if (overflow !== 0) throw new Error(`home: page scrolls sideways by ${overflow}px at ${size.width}`);
      }
      // A button does not inherit the page face unless its CSS says so (the Atlas nights, Nov 14 2026).
      const offFace = await page.evaluate(() => {
        const face = getComputedStyle(document.body).fontFamily;
        return [...document.querySelectorAll('button')]
          .filter((b) => b.offsetParent !== null && getComputedStyle(b).fontFamily !== face && !b.closest('[data-own-face]'))
          .map((b) => (b.textContent ?? '').trim().slice(0, 20));
      });
      if (offFace.length) throw new Error(`${name}: buttons not in the page face at ${size.width}: ${offFace.join(', ')}`);
      await page.close();
    }
  }

  // The home page in both themes at three widths. Either theme failing a request
  // or logging a console error fails the run.
  for (const theme of ['dark', 'light']) {
    for (const width of [390, 768, 1440]) {
      const context = await browser.newContext({
        colorScheme: theme,
        viewport: { width, height: width === 1440 ? 900 : 844 },
      });
      try {
        const page = await context.newPage();
        page.on('console', (message) => {
          if (message.type() === 'error') themeProblems.push(`${theme} ${width}: console error ${message.text()}`);
        });
        page.on('pageerror', (error) => themeProblems.push(`${theme} ${width}: page error ${error.message}`));
        page.on('requestfailed', (request) => themeProblems.push(`${theme} ${width}: failed request ${request.url()}`));
        page.on('response', (response) => {
          if (response.status() >= 400) themeProblems.push(`${theme} ${width}: ${response.status()} ${response.url()}`);
        });
        await page.goto(`${base}/`, { waitUntil: 'networkidle' });
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 600) {
            window.scrollTo(0, y);
            await new Promise((ok) => setTimeout(ok, 60));
          }
          window.scrollTo(0, 0);
        });
        await page.waitForLoadState('networkidle');
        const painted = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
        themePaint.set(theme, painted);
        const target = join(shots, `home-${theme}-${width}.png`);
        await mkdir(shots, { recursive: true });
        await page.screenshot({ path: target, fullPage: true });
      } finally {
        await context.close();
      }
    }
  }
  if (themePaint.get('dark') === themePaint.get('light')) {
    themeProblems.push(`both themes paint the same ground: ${themePaint.get('dark')}`);
  }
  if (themeProblems.length > 0) {
    throw new Error(`home themes: ${themeProblems.join('; ')}`);
  }
  console.log('shots: home in 2 themes x 3 widths');

  // The inner pages in both themes at three widths. A console error or a failed request fails the run.
  const innerPages = ['work/rich-life', 'work/blackfin', 'work/atlas', 'method', 'principles'];
  const innerProblems = [];
  for (const theme of ['dark', 'light']) {
    for (const width of [390, 768, 1440]) {
      const context = await browser.newContext({
        colorScheme: theme,
        viewport: { width, height: width === 1440 ? 900 : 844 },
      });
      try {
        for (const route of innerPages) {
          const page = await context.newPage();
          page.on('console', (message) => {
            if (message.type() === 'error') innerProblems.push(`${route} ${theme} ${width}: console error ${message.text()}`);
          });
          page.on('pageerror', (error) => innerProblems.push(`${route} ${theme} ${width}: page error ${error.message}`));
          page.on('requestfailed', (request) => innerProblems.push(`${route} ${theme} ${width}: failed request ${request.url()}`));
          page.on('response', (response) => {
            if (response.status() >= 400) innerProblems.push(`${route} ${theme} ${width}: ${response.status()} ${response.url()}`);
          });
          await page.goto(`${base}/${route}/`, { waitUntil: 'networkidle' });
          await page.evaluate(async () => {
            for (let y = 0; y < document.body.scrollHeight; y += 600) {
              window.scrollTo(0, y);
              await new Promise((ok) => setTimeout(ok, 60));
            }
            window.scrollTo(0, 0);
          });
          await page.waitForLoadState('networkidle');
          await page.screenshot({ path: join(shots, `inner-${route.replace('/', '-')}-${theme}-${width}.png`), fullPage: true });
          await page.close();
        }
      } finally {
        await context.close();
      }
    }
  }
  if (innerProblems.length > 0) {
    throw new Error(`inner pages: ${innerProblems.join('; ')}`);
  }
  console.log('shots: inner pages in 2 themes x 3 widths');

  // The home page paints both themes from plain custom properties, and data-theme overrides the system theme.
  const themeTokens = {
    light: { ground: '#e7e2d6', ink: '#1a1a18', accent: '#2e4a8c' },
    dark: { ground: '#1b1e1a', ink: '#e7e2d6', accent: '#93a9ec' },
  };
  const fallbackProblems = [];
  for (const theme of ['dark', 'light']) {
    const context = await browser.newContext({ colorScheme: theme, viewport: { width: 768, height: 844 } });
    try {
      const page = await context.newPage();
      await page.goto(`${base}/`, { waitUntil: 'networkidle' });
      const paint = await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement);
        const button = getComputedStyle(document.querySelector('.write'));
        return { bg: root.backgroundColor, ink: root.color, accent: button.color };
      });
      const expected = themeTokens[theme];
      const check = (label, actual, want) => {
        if (!sameChannels(rgbChannels(actual), hexChannels(want))) {
          fallbackProblems.push(`${theme} ${label} is ${actual}, expected ${want}`);
        }
      };
      check('page background', paint.bg, expected.ground);
      check('page text', paint.ink, expected.ink);
      check('link accent', paint.accent, expected.accent);
      const ratio = contrastRatio(rgbChannels(paint.bg), rgbChannels(paint.accent));
      if (!(ratio >= 4.5)) fallbackProblems.push(`${theme} accent contrast is ${ratio.toFixed(2)}`);
      const override = theme === 'dark' ? 'light' : 'dark';
      await page.evaluate((value) => document.documentElement.setAttribute('data-theme', value), override);
      const flipped = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
      check(`data-theme="${override}" background`, flipped, themeTokens[override].ground);
    } finally {
      await context.close();
    }
  }
  if (fallbackProblems.length > 0) {
    throw new Error(`home theme tokens: ${fallbackProblems.join('; ')}`);
  }
  console.log('shots: home paints both themes from its tokens, and data-theme overrides them');

  // Home picture weight: scroll to the bottom so lazy pictures load.
  const pictureWeight = [];
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 900 : 844 } });
    try {
      const page = await context.newPage();
      const pending = [];
      page.on('response', (response) => {
        if (response.request().resourceType() !== 'image') return;
        const url = response.url();
        pending.push(response.body().then((buffer) => ({ url, bytes: buffer.length })).catch(() => null));
      });
      await page.goto(`${base}/`, { waitUntil: 'networkidle' });
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) {
          window.scrollTo(0, y);
          await new Promise((ok) => setTimeout(ok, 60));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForLoadState('networkidle');
      const images = (await Promise.all(pending)).filter(Boolean);
      for (const image of images) {
        if (image.bytes > 250 * 1024) {
          throw new Error(`home pictures: ${image.url} is ${Math.round(image.bytes / 1024)} KB at ${width}`);
        }
      }
      const total = images.reduce((sum, image) => sum + image.bytes, 0);
      pictureWeight.push({ width, total });
    } finally {
      await context.close();
    }
  }
  const at390 = Math.round((pictureWeight.find((entry) => entry.width === 390)?.total ?? 0) / 1024);
  const at1440 = Math.round((pictureWeight.find((entry) => entry.width === 1440)?.total ?? 0) / 1024);
  if (at390 > 900 || at1440 > 1300) {
    throw new Error(`home pictures weigh ${at390} KB at 390 and ${at1440} KB at 1440`);
  }
  console.log(`shots: home pictures weigh ${at390} KB at 390 and ${at1440} KB at 1440`);

  // Without JavaScript the Blackfin sentence must still read as a true sentence from the data.
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await noJs.newPage();
    await page.goto(`${base}/`, { waitUntil: 'networkidle' });
    const text = (await page.locator('#since').textContent()) ?? '';
    const data = JSON.parse(await readFile(join(siteRoot, 'src', 'data', 'blackfin.json'), 'utf8'));
    for (const figure of [data.companiesRead, data.entriesRefused, data.tradesOpened]) {
      if (!text.includes(String(figure))) throw new Error(`home: server sentence lacks ${figure}: ${text}`);
    }
    if (/[$]|\b[A-Z]{2,5}\b/.test(text)) throw new Error(`home: server sentence shows a price or ticker: ${text}`);
  } finally {
    await noJs.close();
  }

  // The button drops changes onto the ship: three clicks end with three changes aboard.
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    let pageErrors = 0;
    try {
      const page = await context.newPage();
      page.on('console', (message) => {
        if (message.type() === 'error') pageErrors += 1;
      });
      page.on('pageerror', () => {
        pageErrors += 1;
      });
      await page.goto(`${base}/`, { waitUntil: 'networkidle' });
      for (let i = 0; i < 3; i += 1) {
        await page.locator('#drop').click();
        await page.waitForTimeout(250);
      }
      await page.waitForFunction(() => document.getElementById('bowl-say')?.textContent === '3 changes aboard.', null, {
        timeout: 45_000, // a change may be sent back once, so the trip takes 10 to 15 seconds
      });
      if (pageErrors > 0) throw new Error(`home: dropping changes reached the console ${pageErrors} time(s)`);
      console.log('shots: three dropped changes end with 3 changes aboard');
    } finally {
      await context.close();
    }
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server.listening) await new Promise((ok) => server.close(ok));
}

console.log(
  `shots: ${pageCount} pages x ${widths.length} widths, ${consoleErrors} console errors, ${failedRequests} failed requests`,
);
if (consoleErrors > 0 || failedRequests > 0) process.exitCode = 1;
