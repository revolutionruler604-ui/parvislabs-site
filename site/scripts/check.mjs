import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { existsSync } from 'node:fs';

const siteRoot = resolve(new URL('..', import.meta.url).pathname);
const args = process.argv.slice(2);
const release = args.includes('--release');
let projectsArg;
for (let index = 0; index < args.length; index += 1) {
  if (args[index] === '--projects') {
    projectsArg = args[index + 1];
    args.splice(index, 2);
    index -= 2;
  } else if (args[index].startsWith('--projects=')) {
    projectsArg = args[index].slice('--projects='.length);
    args.splice(index, 1);
    index -= 1;
  }
}
const dirArg = args.find((arg) => !arg.startsWith('--'));
const dist = resolve(dirArg ?? process.env.CHECK_DIR ?? join(siteRoot, 'dist'));
const seedPath = resolve(siteRoot, '..', '.seed', 'principles.json');
const dataPath = join(siteRoot, 'src', 'data', 'principles.json');
const principlesPath = existsSync(seedPath) ? seedPath : dataPath;
const projectDir = projectsArg ? resolve(projectsArg) : join(siteRoot, 'src', 'content', 'projects');
const contactEmail = process.env.PUBLIC_CONTACT_EMAIL;

async function walk(dir, suffix) {
  const out = [];
  for (const name of await readdir(dir)) {
    const full = join(dir, name);
    if ((await stat(full)).isDirectory()) out.push(...(await walk(full, suffix)));
    else if (name.endsWith(suffix)) out.push(full);
  }
  return out;
}

function decode(text) {
  return text
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&#x27;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&nbsp;', ' ');
}

function normalize(text) {
  return decode(text).replace(/\s+/g, ' ').trim();
}

function attribute(tag, name) {
  const match = new RegExp(`(?:^|\\s)${name}\\s*=\\s*"([^"]*)"`, 'i').exec(tag);
  return match ? match[1] : null;
}

function isForeign(url) {
  return /^(?:https?:)?\/\//i.test(url.trim());
}

function tagName(tag) {
  const match = /^<\s*([a-z0-9-]+)/i.exec(tag);
  return match ? match[1].toLowerCase() : '';
}

function foreignStyleUrls(css) {
  const urls = new Set();
  for (const match of css.matchAll(/url\(\s*(?:(['"])(.*?)\1|([^)\s]+))\s*\)/gi)) {
    urls.add(match[2] ?? match[3]);
  }
  for (const match of css.matchAll(/@import\s+(['"])(.*?)\1/gi)) {
    urls.add(match[2]);
  }
  return [...urls].filter(isForeign);
}

function frontMatter(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
  return match ? match[1] : '';
}

const principles = JSON.parse(await readFile(principlesPath, 'utf8'));
const principleBodies = principles.groups.flatMap((group) =>
  group.items.map((item) => normalize(item.body)),
);

const pages = existsSync(dist) ? (await walk(dist, '.html')).sort() : [];
const styleSheets = existsSync(dist) ? (await walk(dist, '.css')).sort() : [];
const problems = [];
const titles = new Map();

if (pages.length === 0) problems.push('no HTML pages found in dist');
if (!existsSync(join(dist, 'index.html'))) problems.push('home page index.html is missing');
if (!existsSync(join(dist, 'principles', 'index.html'))) {
  problems.push('principles page principles/index.html is missing');
}

for (const file of pages) {
  const page = relative(dist, file).split(sep).join('/');
  const html = await readFile(file, 'utf8');
  const text = normalize(html);

  if (/\u2014|&mdash;|&#8212;|&#x2014;/i.test(html)) problems.push(`${page}: em dash`);

  const banned = /\b(?:revolutionary|supercharge|unlock|seamless|AI-powered)\b/i.exec(html);
  if (banned) problems.push(`${page}: banned word "${banned[0]}"`);

  if (/TODO|lorem/i.test(html)) problems.push(`${page}: placeholder text`);

  // Blackfin shows one figure, the account's percent change, and only in its live element (#tick-pct on
  // the home page, CLAUDE.md disclosure table). No sentence anywhere may carry a gain or loss figure.
  if (/\b(?:up|down|gained|lost)\s+\d+(?:\.\d+)?\s?%|\b(?:account|portfolio)\s+(?:is|was)\s+(?:up|down|unchanged)\b/i.test(text)) problems.push(`${page}: performance figure`);

  // Atlas shows a short description and one demo on an invented hotel (CLAUDE.md, the disclosure table).
  // The page must say its numbers are made up, and carries no money figure, so no rate can appear.
  if (page === 'work/atlas/index.html') {
    if (!text.includes('Every number here is made up.')) problems.push(`${page}: Atlas demo without its made-up caption`);
    if (/\$\s?\d/.test(text)) problems.push(`${page}: money figure on the Atlas page`);
  }

  // Frame Board shows features, never the real family (CLAUDE.md, the disclosure table): no child's age or
  // birth date, no health details, no schedule times, and no mention of the home network, doorbell or camera.
  // It reads the Frame Board page and the Frame Board section of the home page, as text without tags.
  const fbHtml = page === 'work/frame-board/index.html' ? html
    : page === 'index.html' ? (/id="frame-board"[\s\S]*?(?=<section[^>]*id="next")/.exec(html) ?? [''])[0] : '';
  if (fbHtml) {
    const fbText = normalize(fbHtml.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '));
    const num = '(?:\\d+|an?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)';
    const fbPrivate = new RegExp([
      `\\b${num}[\\s-]*(?:days?|weeks?|months?|years?)[\\s-]*old\\b`,
      '\\bnewborn\\b', '\\bborn\\s+\\w', '\\bbirth\\s?(?:day|date)\\b', '\\bdue\\s+date\\b',
      '\\b(?:fever|temperature|medicine|medication|dose|weighs|weight|pediatrician|jaundice|reflux|diagnos\\w*)\\b',
      '\\b\\d{1,2}(?::\\d{2})?\\s?(?:a\\.m\\.|p\\.m\\.|am\\b|pm\\b)', '\\b\\d{1,2}:\\d{2}\\b',
      '\\b(?:doorbell|camera|wi-?fi|password|ip address|router)\\b',
    ].join('|'), 'i').exec(fbText);
    if (fbPrivate) problems.push(`${page}: private family detail "${fbPrivate[0]}"`);
  }

  for (const tag of html.match(/<[^>]+>/g) ?? []) {
    const name = tagName(tag);
    const src = attribute(tag, 'src');

    if (src && isForeign(src)) {
      if (['script', 'iframe', 'video', 'audio', 'source'].includes(name)) {
        problems.push(`${page}: foreign <${name} src> "${src}"`);
      } else {
        problems.push(`${page}: foreign src "${src}"`);
      }
    }

    const data = attribute(tag, 'data');
    if (name === 'object' && data && isForeign(data)) {
      problems.push(`${page}: foreign <object data> "${data}"`);
    }

    const srcset = attribute(tag, 'srcset');
    if (srcset) {
      for (const candidate of srcset.split(',')) {
        const url = candidate.trim().split(/\s+/)[0];
        if (url && isForeign(url)) problems.push(`${page}: foreign srcset "${url}"`);
      }
    }

    const inlineStyle = attribute(tag, 'style');
    if (inlineStyle) {
      for (const url of foreignStyleUrls(decode(inlineStyle))) {
        problems.push(`${page}: foreign style url "${url}"`);
      }
    }

    // A link to this site must land on a page that was built, and on an anchor that page has.
    if (name === 'a') {
      const href = decode(attribute(tag, 'href') ?? '');
      if (href.startsWith('#') || (href.startsWith('/') && !href.startsWith('//'))) {
        const [path, anchor] = href.split('#');
        let target = file;
        if (path) {
          const direct = join(dist, path);
          target = [direct, join(direct, 'index.html'), `${direct}.html`].find(
            (candidate) => existsSync(candidate) && !candidate.endsWith(sep) && /\.[a-z0-9]+$/i.test(candidate),
          );
          if (!target) problems.push(`${page}: link to a page that is not built "${href}"`);
        }
        if (target && anchor && target.endsWith('.html')) {
          const targetHtml = target === file ? html : await readFile(target, 'utf8');
          const ids = new Set([...targetHtml.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
          if (!ids.has(anchor)) problems.push(`${page}: link to an anchor that is not on the page "${href}"`);
        }
      }
    }

    if (name === 'link') {
      const href = attribute(tag, 'href');
      if (href && isForeign(href)) {
        const rel = (attribute(tag, 'rel') ?? '').toLowerCase().split(/\s+/);
        if (rel.includes('stylesheet')) problems.push(`${page}: foreign stylesheet "${href}"`);
        else problems.push(`${page}: foreign link "${href}"`);
      }
    }
  }

  for (const match of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    for (const url of foreignStyleUrls(match[1])) problems.push(`${page}: foreign style url "${url}"`);
  }

  const emails = new Set(html.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? []);
  for (const email of emails) {
    if (!contactEmail || email !== contactEmail) problems.push(`${page}: email address "${email}"`);
  }

  const h1Count = (html.match(/<h1\b/gi) ?? []).length;
  if (h1Count !== 1) problems.push(`${page}: ${h1Count} h1 elements`);

  const title = /<title>([\s\S]*?)<\/title>/i.exec(html);
  const titleText = title ? normalize(title[1]) : '';
  if (!titleText) problems.push(`${page}: missing title`);
  else {
    const seen = titles.get(titleText);
    if (seen) problems.push(`${page}: duplicate title "${titleText}" (also ${seen})`);
    else titles.set(titleText, page);
  }

  const descriptionTag = (html.match(/<meta\b[^>]*>/gi) ?? []).find(
    (tag) => (attribute(tag, 'name') ?? '').toLowerCase() === 'description',
  );
  const descriptionText = descriptionTag ? normalize(attribute(descriptionTag, 'content') ?? '') : '';
  if (!descriptionText) problems.push(`${page}: missing meta description`);

  if (page === 'principles/index.html') {
    for (const body of principleBodies) {
      if (!text.includes(body)) problems.push(`${page}: principle body does not match the seed`);
    }
  }
}

for (const file of styleSheets) {
  const page = relative(dist, file).split(sep).join('/');
  const css = await readFile(file, 'utf8');
  for (const url of foreignStyleUrls(css)) problems.push(`${page}: foreign style url "${url}"`);
}

if (release && existsSync(projectDir)) {
  const relativeDir = relative(siteRoot, projectDir);
  const label = relativeDir.startsWith('..') ? 'projects' : relativeDir.split(sep).join('/');
  for (const name of (await readdir(projectDir)).sort()) {
    if (!name.endsWith('.md')) continue;
    const raw = await readFile(join(projectDir, name), 'utf8');
    if (/^draft:\s*true\s*$/im.test(frontMatter(raw))) {
      problems.push(`${label}/${name}: draft project`);
    }
  }
}

for (const problem of problems) console.log(`problem: ${problem}`);
console.log(`check: ${problems.length} problems`);
if (problems.length > 0) process.exitCode = 1;
