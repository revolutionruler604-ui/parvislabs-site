import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { htmlUnits, maskAll, readSeed, scriptStrings } from './home-strings.mjs';

// The Blackfin snapshot as the page prints it, read from the data file so a refresh never breaks a plant.
const BLACKFIN = JSON.parse(readFileSync(new URL('../src/data/blackfin.json', import.meta.url), 'utf8'));
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const BLACKFIN_AS_OF = (([y, m, d]) => 'As of ' + MONTHS[m - 1] + ' ' + d + ', ' + y + '.')(BLACKFIN.asOf.split('-').map(Number));
// The since line as the build writes it today, so the planted cases follow a snapshot refresh.
const nOf = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const BLACKFIN_REFUSED = `refused ${nOf(BLACKFIN.entriesRefused, 'order', 'orders')}`;
const BLACKFIN_SINCE = `it has looked at ${nOf(BLACKFIN.companiesRead, 'stock', 'stocks')}, ${BLACKFIN_REFUSED} and made ${nOf(BLACKFIN.tradesOpened, 'trade', 'trades')}.`;
const BLACKFIN_PCT = (v => (v > 0 ? '+' : v < 0 ? '\u2212' : '') + Math.abs(v).toFixed(2) + '%')(Number(BLACKFIN.changePct));

const siteDir = fileURLToPath(new URL('..', import.meta.url));
const seedDir = resolve(siteDir, '..', '.seed');
const scriptPath = fileURLToPath(import.meta.url);
const args = process.argv.slice(2);

function argument(name) {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

const distDir = resolve(argument('--dist') ?? resolve(siteDir, 'dist'));
// The words home.js can show are read from its source file.
const homeScriptPath = resolve(argument('--script') ?? resolve(siteDir, 'src/scripts/home.js'));

const allowed = ['The problem', 'What it does', 'How it was built', 'What we learned'];

function mechanical(text) {
  return text
    .replace(/\\\$/g, '$')
    .replace(/<b>(.*?)<\/b>/g, '**$1**')
    .replace(/<code>(.*?)<\/code>/g, '`$1`');
}

function stripMarks(text) {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/^\s*\|?[\s:|-]+\|?\s*$/gm, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[*_`>]/g, '')
    .replace(/\|/g, ' ');
}

function sentences(text) {
  return stripMarks(text)
    .split('\n')
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((sentence) => sentence.replace(/\s+/g, ' ').trim())
    .filter((sentence) => /[\p{L}\p{N}]/u.test(sentence));
}

function straighten(text) {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');
}

function decodeHtml(text) {
  return straighten(text)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function pageText(file) {
  const html = readFileSync(file, 'utf8');
  const blocks = html.replace(/<\/p>|<\/h1>|<\/h2>|<\/h3>|<\/li>|<\/div>|<\/section>|<br\s*\/?>/gi, '\n');
  return decodeHtml(blocks.replace(/<[^>]+>/g, '')).replace(/[ \t]+/g, ' ').trim();
}

// Pictures and the next-project links carry words that are checked in other ways,
// so the "nothing added" direction leaves them out.
function withoutAllowed(html) {
  return html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '\n')
    .replace(/<figure\b[\s\S]*?<\/figure>/gi, '\n')
    .replace(/<nav\b[^>]*class="[^"]*\bnext-project\b[^"]*"[\s\S]*?<\/nav>/gi, '\n');
}

function figcaptions(html) {
  return [...html.matchAll(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/gi)].map((match) =>
    decodeHtml(match[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim(),
  );
}

function textFromHtml(html) {
  return decodeHtml(html.replace(/<\/p>|<\/h1>|<\/h2>|<\/h3>|<\/li>|<\/div>|<\/section>|<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''));
}

function normalizedText(text) {
  return decodeHtml(text).replace(/\s+/g, ' ').trim();
}

// Script and style bodies are code, never read by a visitor.
function textNodesOf(html) {
  const visible = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ');
  return [...visible.matchAll(/>([^<]*)</g)].map((match) => normalizedText(match[1])).filter(Boolean);
}

function figureBlocks(html) {
  return [...html.matchAll(/<figure\b[\s\S]*?<\/figure>/gi)].map((match) => match[0]);
}

function attributeValues(html) {
  return [...html.matchAll(/\b(?:alt|aria-label)="([^"]*)"/gi)].map((match) => normalizedText(match[1]));
}

function svgTexts(html) {
  return [...html.matchAll(/<svg\b[\s\S]*?<\/svg>/gi)].map((match) =>
    normalizedText(match[0].replace(/<[^>]+>/g, ' ')),
  );
}

function wordsOf(text) {
  return normalizedText(text).toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

function withoutCaptionOrSvg(html) {
  return html.replace(/<figcaption\b[\s\S]*?<\/figcaption>/gi, ' ').replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ');
}

function nextProjectNavs(html) {
  return [...html.matchAll(/<nav\b[^>]*class="[^"]*\bnext-project\b[^"]*"[\s\S]*?<\/nav>/gi)].map(
    (match) => match[0],
  );
}

function projectTitles() {
  const dir = resolve(siteDir, 'src/content/projects');
  return readdirSync(dir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const raw = readFileSync(join(dir, file), 'utf8');
      const head = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
      const line = head ? /^title:\s*(.*)$/m.exec(head[1]) : null;
      return line ? decodeHtml(line[1]).trim() : '';
    })
    .filter(Boolean);
}

function methodFigureSpec() {
  const source = readFileSync(resolve(seedDir, 'method-page-v0.4.md'), 'utf8').replace(/\r\n/g, '\n');
  const lines = source.split('\n');
  const start = lines.findIndex((line) => line.startsWith('# Figure 1 spec'));
  if (start === -1) return '';
  const end = lines.findIndex((line, index) => index > start && line.startsWith('# '));
  const block = lines.slice(start, end === -1 ? undefined : end).join('\n');
  return stripMarks(mechanical(block)).replace(/\s+/g, ' ').trim();
}

// Figure words on a project page: captions, labels (alt and aria-label) and the text
// inside drawings. They are checked against .seed/figures-v0.3.md, taken from the
// project pages as reviewed at commit 4576c52.
// A figure drawn from data (the Atlas demo) also carries plain text: names, legend and
// sentences. Its numbers come from a data file with its own check, so digits are masked
// to N, and each distinct sentence counts once, since every night repeats the same words.
function figureItems(html) {
  const items = [];
  for (const figure of figureBlocks(html)) {
    for (const caption of figcaptions(figure)) items.push(`Caption: ${caption}`);
    for (const value of attributeValues(figure)) items.push(`Label: ${value}`);
    for (const text of svgTexts(figure)) if (text) items.push(`Drawing: ${text}`);
    const texts = new Set(textNodesOf(withoutCaptionOrSvg(figure)).map((text) => text.replace(/\d+/g, 'N')));
    for (const text of texts) items.push(`Text: ${text}`);
  }
  return items;
}

function readFigureSeed() {
  const source = readFileSync(resolve(seedDir, 'figures-v0.3.md'), 'utf8').replace(/\r\n/g, '\n');
  const byTitle = new Map();
  for (const part of source.split(/^# /m).slice(1)) {
    const newline = part.indexOf('\n');
    byTitle.set(
      part.slice(0, newline).trim(),
      part.slice(newline + 1).split('\n').map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean),
    );
  }
  return byTitle;
}

function countOf(list) {
  const counts = new Map();
  for (const item of list) counts.set(item, (counts.get(item) ?? 0) + 1);
  return counts;
}

// Both lists must hold the same strings the same number of times.
function sameStrings(actual, expected) {
  const have = countOf(actual);
  const want = countOf(expected);
  const extra = [];
  const missing = [];
  for (const [item, n] of have) for (let k = want.get(item) ?? 0; k < n; k += 1) extra.push(item);
  for (const [item, n] of want) for (let k = have.get(item) ?? 0; k < n; k += 1) missing.push(item);
  return { extra, missing };
}

function projectFigureProblems(name, html, expected) {
  const problems = [];
  const { extra, missing } = sameStrings(figureItems(html), expected);
  for (const item of extra) problems.push(`figure [${name}]: not in the figure seed: ${item}`);
  for (const item of missing) problems.push(`figure [${name}]: in the figure seed, not on the page: ${item}`);
  return problems;
}

function homeProblems(dist) {
  const problems = [];
  const html = readFileSync(resolve(dist, 'index.html'), 'utf8');
  const units = htmlUnits(html);
  const script = scriptStrings(readFileSync(homeScriptPath, 'utf8'));
  for (const problem of script.problems) problems.push(`home [script]: ${problem}`);

  const seed = maskAll(readSeed(readFileSync(resolve(seedDir, 'home-page-v0.4.md'), 'utf8')));
  const origin = new Map();
  const mark = (list, where) => list.forEach((text) => { if (!origin.has(text)) origin.set(text, where); });

  const nodes = units.nodes.map((node) => node.text);
  const maskedNodes = maskAll(nodes);
  mark(maskedNodes, 'page text');
  const attributes = units.attributes.map((attribute) => attribute.text);
  mark(attributes, 'page label');
  const actual = [...maskedNodes, ...attributes, ...(units.description ? [units.description] : []), ...script.messages, ...script.labels];
  mark(script.messages, 'home.js message');
  mark(script.labels, 'globe label');
  if (units.description) mark([units.description], 'meta description');

  const { extra, missing } = sameStrings(actual, seed);
  for (const item of extra) problems.push(`home [${origin.get(item)}]: not in the home seed: ${item}`);
  for (const item of missing) problems.push(`home [seed]: in the home seed, not on the page or in home.js: ${item}`);
  return problems;
}

function methodFigureProblems(figure, copyText) {
  const problems = [];
  const allowedWords = new Set(wordsOf(copyText));
  const allowedPhrase = wordsOf(copyText).join(' ');
  const items = new Set([...textNodesOf(figure), ...attributeValues(figure), ...figcaptions(figure)]);
  for (const item of items) {
    const words = wordsOf(item);
    const outside = words.filter((word) => !allowedWords.has(word));
    const phraseMissing = words.length >= 4 && !allowedPhrase.includes(words.join(' '));
    if (outside.length > 0 || phraseMissing) {
      problems.push(`figure [method]: not in the spec or the page copy: ${item}`);
    }
  }
  return problems;
}

function navProblems(name, html, askText, titles, requireNone = false) {
  const problems = [];
  const navs = nextProjectNavs(html);
  if (requireNone) {
    if (navs.length > 0) problems.push(`extra [${name}]: ${navs.length} next-project nav blocks, none allowed`);
    return problems;
  }
  if (navs.length !== 1) {
    problems.push(`extra [${name}]: ${navs.length} next-project nav blocks, exactly one allowed`);
    return problems;
  }
  const text = normalizedText(navs[0].replace(/<[^>]+>/g, ' '));
  const present = titles.filter((title) => text.includes(title));
  if (present.length !== 1) {
    problems.push(`extra [${name}]: next-project nav does not name exactly one project: ${text}`);
    return problems;
  }
  const rest = text.replace(present[0], ' ').replace(askText, ' ').replace(/\s+/g, ' ').trim();
  if (rest !== '') problems.push(`extra [${name}]: next-project nav text not allowed: ${text}`);
  return problems;
}

function headOf(html) {
  const title = /<title>([\s\S]*?)<\/title>/i.exec(html);
  const description = /<meta[^>]+name="description"[^>]*content="([^"]*)"/i.exec(html);
  return {
    title: title ? decodeHtml(title[1]).trim() : '',
    description: description ? decodeHtml(description[1]).trim() : '',
  };
}

function readProjectBlocks() {
  const source = readFileSync(resolve(seedDir, 'project-pages-v0.3.md'), 'utf8').replace(/\r\n/g, '\n');
  const blocks = new Map();
  for (const part of source.split(/^# /m).slice(1)) {
    const newline = part.indexOf('\n');
    blocks.set(part.slice(0, newline).trim(), mechanical(part.slice(newline + 1)));
  }
  return blocks;
}

function homeLineOf(block) {
  const home = /## Home-page line\n\nHome line: "(.*)"/.exec(block);
  if (!home) throw new Error('project block has no home line');
  return home[1];
}

function projectSource(block) {
  const home = /## Home-page line\n\nHome line: "(.*)"/.exec(block);
  if (!home) throw new Error('project block has no home line');
  const body = block.slice(0, home.index).trim();
  const sections = body.split(/^## /m).slice(1).map((section) => {
    const newline = section.indexOf('\n');
    return { heading: section.slice(0, newline).trim(), text: section.slice(newline + 1).trim() };
  });
  if (sections.length === 0) return `${body}\n\n${home[1]}`;
  return [
    ...sections.filter((section) => allowed.includes(section.heading)).map((section) => `## ${section.heading}\n\n${section.text}`),
    home[1],
  ].join('\n\n');
}

function methodSource() {
  const source = readFileSync(resolve(seedDir, 'method-page-v0.4.md'), 'utf8').replace(/\r\n/g, '\n');
  const start = source.indexOf('## How a change ships here');
  const main = mechanical(source.slice(start, source.indexOf('# Figure 1 spec')).trimEnd());
  const figure = source.slice(source.indexOf('# Figure 2 spec'));
  const rows = figure
    .split('\n')
    .filter((line) => /^\|/.test(line))
    .map((line) => line.replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim()));
  const caption = 'Who builds and who reviews, by risk';
  return [main, caption, ...rows.slice(1).flat()].join('\n\n');
}

function methodTable() {
  const source = readFileSync(resolve(seedDir, 'method-page-v0.4.md'), 'utf8').replace(/\r\n/g, '\n');
  const figure = source.slice(source.indexOf('# Figure 2 spec'));
  return figure
    .split('\n')
    .filter((line) => /^\|/.test(line))
    .map((line) => line.replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim()))
    .filter((row) => !row.every((cell) => /^:?-+:?$/.test(cell)))
    .flat();
}

function builtTableCells(html) {
  const table = /<table[\s\S]*?<\/table>/i.exec(html);
  if (!table) return [];
  return [...table[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((match) =>
    decodeHtml(match[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim(),
  );
}

function methodFrontMatterDescription() {
  const raw = readFileSync(resolve(siteDir, 'src/content/pages/method.md'), 'utf8');
  const head = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
  if (!head) return '';
  const line = /^description:\s*(.*)$/m.exec(head[1]);
  return line ? decodeHtml(line[1]).trim() : '';
}

function check(dist) {
  const projects = [
    { title: 'Rich Life', slug: 'rich-life' },
    { title: 'Blackfin', slug: 'blackfin' },
    { title: 'Frame Board', slug: 'frame-board' },
    { title: 'In the lab: Atlas', slug: 'atlas' },
    { title: 'In the lab: Language Coach', slug: 'language-coach' },
  ];

  const pages = [];
  const blocks = readProjectBlocks();
  for (const project of projects) {
    const block = blocks.get(project.title);
    if (!block) throw new Error(`missing source block for ${project.title}`);
    pages.push({
      name: project.slug,
      source: projectSource(block),
      built: resolve(dist, 'work', project.slug, 'index.html'),
      project: true,
      homeLine: homeLineOf(block),
      sourceName: project.title.replace(/^In the lab:\s*/, ''),
    });
  }

  const method = methodSource();
  const methodTableSource = methodTable();
  pages.push({ name: 'method', source: method, built: resolve(dist, 'method', 'index.html') });

  const problems = [];
  const notes = [];

  for (const page of pages) {
    const html = readFileSync(page.built, 'utf8');
    const built = pageText(page.built);
    const sourceSentences = sentences(page.source);
    const sourceText = sourceSentences.join(' ');

    for (const sentence of sourceSentences) {
      if (!built.includes(sentence)) problems.push(`missing [${page.name}]: ${sentence}`);
    }

    if (page.project) {
      const head = headOf(html);
      if (head.description !== page.homeLine) {
        problems.push(`head [${page.name}]: meta description is not the source home line: ${head.description}`);
      }
      if (!head.title.toLowerCase().startsWith(page.sourceName.toLowerCase())) {
        problems.push(`head [${page.name}]: title does not start with ${page.sourceName}: ${head.title}`);
      }

      const status = /<p class="project-status">[\s\S]*?<\/p>/.exec(html);
      if (!status) {
        problems.push(`missing [${page.name}]: project body marker`);
        continue;
      }
      let body = html.slice(status.index + status[0].length, html.indexOf('</main>'));
      body = body.replace(/^\s*<ul>[\s\S]*?<\/ul>/, '');
      const bodyText = textFromHtml(withoutAllowed(body));
      for (const sentence of sentences(bodyText)) {
        if (!sourceText.includes(sentence)) problems.push(`extra [${page.name}]: ${sentence}`);
      }
    } else {
      const head = headOf(html);
      const frontMatter = methodFrontMatterDescription();
      const homeText = pageText(resolve(dist, 'index.html'));
      if (head.description && head.description === frontMatter) {
        notes.push('method meta description from method.md front matter');
      } else if (head.description && homeText.includes(head.description)) {
        notes.push('method meta description from the home page method section');
      } else {
        problems.push(`head [method]: meta description is not in the method.md front matter or the home page: ${head.description}`);
      }

      const mainMatch = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html);
      if (!mainMatch) {
        problems.push('missing [method]: main marker');
        continue;
      }
      const main = mainMatch[1];
      const withoutTable = main.replace(/<table[\s\S]*?<\/table>/gi, '\n');
      for (const sentence of sentences(textFromHtml(withoutAllowed(withoutTable)))) {
        if (!sourceText.includes(sentence)) problems.push(`extra [method]: ${sentence}`);
      }

      const builtCells = builtTableCells(main);
      const expectedCells = methodTableSource;
      if (builtCells.length !== expectedCells.length) {
        problems.push(`table [method]: ${builtCells.length} cells built, ${expectedCells.length} in the source`);
      } else {
        for (let index = 0; index < expectedCells.length; index += 1) {
          if (builtCells[index] !== expectedCells[index]) {
            problems.push(`table [method]: cell ${index + 1} is "${builtCells[index]}", source has "${expectedCells[index]}"`);
          }
        }
      }
    }
  }

  const homeHtml = readFileSync(resolve(dist, 'index.html'), 'utf8');
  for (const project of projects) {
    if (!homeHtml.includes(`href="/work/${project.slug}/"`)) {
      problems.push(`home [${project.slug}]: no link to the project page`);
    }
  }
  problems.push(...homeProblems(dist));

  const figureSeed = readFigureSeed();
  const titles = projectTitles();
  const askText = 'Ask about it';
  for (const project of projects) {
    const projectHtml = readFileSync(resolve(dist, 'work', project.slug, 'index.html'), 'utf8');
    const expectedFigures = figureSeed.get(project.title.replace(/^In the lab:\s*/, ''));
    if (!expectedFigures) throw new Error(`no figure seed for ${project.title}`);
    problems.push(...projectFigureProblems(project.slug, projectHtml, expectedFigures));
    problems.push(...navProblems(project.slug, projectHtml, askText, titles));
  }

  const methodHtml = readFileSync(resolve(dist, 'method', 'index.html'), 'utf8');
  const methodMain = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(methodHtml);
  if (methodMain) {
    const figures = figureBlocks(methodMain[1]);
    if (figures.length !== 1) problems.push(`figure [method]: ${figures.length} figures, one allowed`);
    const allowedCopy = [method, methodFigureSpec()].join('\n\n');
    for (const figure of figures) problems.push(...methodFigureProblems(figure, allowedCopy));
  }
  problems.push(...navProblems('method', methodHtml, askText, titles, true));

  return { problems, notes, count: pages.length };
}

function report(result) {
  if (result.problems.length > 0) {
    for (const problem of result.problems) console.log(problem);
    process.exitCode = 1;
    return;
  }
  for (const note of result.notes) console.log(`copy-match: ${note}`);
  console.log(
    `copy-match: ${result.count} pages and the home page, every sentence of the approved copy is on its page, both ways, head included`,
  );
}

function editFile(file, from, to) {
  const text = readFileSync(file, 'utf8');
  if (!text.includes(from)) throw new Error(`selftest plant does not apply, text not found: ${from}`);
  writeFileSync(file, text.replace(from, to));
}

function edit(root, name, from, to) {
  editFile(join(root, name), from, to);
}

function runSelftest() {
  const plants = [
    {
      name: 'changed word in a project meta description',
      apply(root) {
        const file = join(root, 'work', 'rich-life', 'index.html');
        const html = readFileSync(file, 'utf8');
        writeFileSync(file, html.replace('content="Every dollar counted once', 'content="Every dollar counted twice'));
      },
    },
    {
      name: 'changed word in a project body sentence',
      apply(root) {
        const file = join(root, 'work', 'rich-life', 'index.html');
        const html = readFileSync(file, 'utf8');
        writeFileSync(file, html.replace('A card payment is matched to the card it paid.', 'A card payment is matched to the card it owns.'));
      },
    },
    {
      name: 'added sentence on a project page, outside a figure',
      apply(root) {
        const file = join(root, 'work', 'rich-life', 'index.html');
        const html = readFileSync(file, 'utf8');
        writeFileSync(file, html.replace('</main>', '<p>This sentence is not in the reviewed draft at all.</p></main>'));
      },
    },
    {
      name: 'changed word in a project figcaption against the figure seed',
      apply(root) {
        const file = join(root, 'work', 'rich-life', 'index.html');
        const html = readFileSync(file, 'utf8');
        writeFileSync(file, html.replace('Goals and what each needs a month, for an invented couple.', 'Goals and what each needs a year, for an invented couple.'));
      },
    },
    {
      name: 'changed a figure label on a project page',
      apply(root) {
        edit(root, join('work', 'rich-life', 'index.html'), 'Rich Life, the goal screen on a phone', 'Rich Life, the goals screen on a phone');
      },
    },
    {
      name: 'changed a word in a drawing on a project page',
      apply(root) {
        edit(root, join('work', 'blackfin', 'index.html'), 'The bot reads its written steps', 'The bot reads its steps');
      },
    },
    {
      name: 'changed a word in a figure drawn from data',
      apply(root) {
        edit(root, join('work', 'atlas', 'index.html'), 'Booked how far ahead', 'Booked how long ahead');
      },
    },
    {
      name: 'changed a word in a figure sentence that holds numbers',
      apply(root) {
        edit(root, join('work', 'atlas', 'index.html'), 'rooms left of 150 on', 'rooms free of 150 on');
      },
    },
    {
      name: 'changed word in a home paragraph',
      apply(root) {
        edit(root, 'index.html', 'Great things from small beginnings.', 'Great things from tiny beginnings.');
      },
    },
    {
      name: 'home sentence missing from the page',
      apply(root) {
        edit(root, 'index.html', '<p class="lede">One address. A person reads it. The agents are not allowed.</p>', '');
      },
    },
    {
      name: 'home sentence added to the page',
      apply(root) {
        edit(root, 'index.html', '<h2>Say hello.</h2>', '<h2>Say hello.</h2><p>This sentence is not in the reviewed draft at all.</p>');
      },
    },
    {
      name: 'changed word in a home.js message',
      apply(root, ctx) {
        editFile(ctx.script, 'The crew is busy. Give them a second.', 'The crew is busy. Give them a minute.');
      },
    },
    {
      name: 'home.js message removed',
      apply(root, ctx) {
        editFile(ctx.script, "'There. Tap again to undo.'", "''");
      },
    },
    {
      name: 'home.js message added',
      apply(root, ctx) {
        editFile(ctx.script, "$('mail');", "$('mail'); $('board-say').textContent = 'A new message nobody reviewed.';");
      },
    },
    {
      name: 'changed globe label in home.js',
      apply(root, ctx) {
        editFile(ctx.script, "place: 'Callao'", "place: 'Lima'");
      },
    },
    {
      name: 'changed aria-label on the home page',
      apply(root) {
        edit(root, 'index.html', 'aria-label="Drop a change"', 'aria-label="Drop one change"');
      },
    },
    {
      name: 'changed alt text on the home page',
      apply(root) {
        edit(root, 'index.html', 'with one more egg counted', 'with two more eggs counted');
      },
    },
    {
      name: 'changed a data-no message on the home page',
      apply(root) {
        edit(root, 'index.html', 'No jump, no trade.', 'No jump, still a trade.');
      },
    },
    {
      name: 'changed the home page meta description',
      apply(root) {
        edit(root, 'index.html', 'plan, build and check each other', 'plan, build and test each other');
      },
    },
    {
      name: 'changed a word in the Blackfin sentence',
      apply(root) {
        edit(root, 'index.html', BLACKFIN_REFUSED, BLACKFIN_REFUSED.replace('refused', 'turned down'));
      },
    },
    {
      name: 'changed the computed percent sentence around its number',
      apply(root) {
        edit(root, 'index.html', '% of the way round.', '% of the way home.');
      },
    },
    {
      name: 'home page link to a project page missing',
      apply(root) {
        edit(root, 'index.html', 'href="/work/atlas/"', 'href="/work/atlas-x/"');
      },
    },
    {
      name: 'a number changed in blackfin.json (must still pass)',
      expectPass: true,
      apply(root) {
        // The page the build writes after the data file changes: new counts, a new date, up instead of down.
        edit(root, 'index.html', 'Since November 2 ' + BLACKFIN_SINCE, 'Since December 3 it has looked at 1 stock, refused 1 order and made 12 trades.');
        edit(root, 'index.html', BLACKFIN_AS_OF, 'As of December 14, 2026.');
        // The live percent moves; only its shape is checked.
        edit(root, 'index.html', BLACKFIN_PCT, '+3.17%');
      },
    },
    {
      name: 'a performance figure added to the Blackfin sentence',
      apply(root) {
        // Blackfin shows no performance figures (PRODUCT.md). Adding one must fail.
        edit(root, 'index.html', 'and made 2 trades.', 'and made 2 trades. The account is up 2.5%.');
      },
    },
    {
      name: 'a different percent of the way round (must still pass)',
      expectPass: true,
      apply(root) {
        edit(root, 'index.html', '<span id="round">20</span>', '<span id="round">27</span>');
      },
    },
    {
      name: 'deleted sentence on the method page',
      apply(root) {
        const file = join(root, 'method', 'index.html');
        const html = readFileSync(file, 'utf8');
        writeFileSync(file, html.replace('<p>Six steps, one owner each.</p>', ''));
      },
    },
    {
      name: 'added sentence on the method page',
      apply(root) {
        const file = join(root, 'method', 'index.html');
        const html = readFileSync(file, 'utf8');
        writeFileSync(file, html.replace('</main>', '<p>This sentence is not in the reviewed draft at all.</p></main>'));
      },
    },
    {
      name: 'changed table cell on the method page',
      apply(root) {
        const file = join(root, 'method', 'index.html');
        const html = readFileSync(file, 'utf8');
        writeFileSync(
          file,
          html.replace('<td data-label="Who reviews">One automated review</td>', '<td data-label="Who reviews">Two automated reviews</td>'),
        );
      },
    },
    {
      name: 'added paragraph after a figcaption inside a project figure',
      apply(root) {
        const file = join(root, 'work', 'rich-life', 'index.html');
        const html = readFileSync(file, 'utf8');
        writeFileSync(
          file,
          html.replace('</figcaption>', '</figcaption><p>This sentence is not in the reviewed draft at all.</p>'),
        );
      },
    },
    {
      name: 'added sentence inside the method figure',
      apply(root) {
        const file = join(root, 'method', 'index.html');
        const html = readFileSync(file, 'utf8');
        writeFileSync(file, html.replace('</figure>', '<p>This sentence is not in the reviewed draft at all.</p></figure>'));
      },
    },
    {
      name: 'added a second next-project nav holding a sentence',
      apply(root) {
        const file = join(root, 'work', 'rich-life', 'index.html');
        const html = readFileSync(file, 'utf8');
        writeFileSync(
          file,
          html.replace('</main>', '<nav class="next-project"><p>This sentence is not in the reviewed draft at all.</p></nav></main>'),
        );
      },
    },
  ];

  const passed = [];
  const missed = [];
  for (const plant of plants) {
    const root = mkdtempSync(join(tmpdir(), 'copy-match-'));
    try {
      cpSync(distDir, root, { recursive: true });
      const script = join(root, '..', `${basename(root)}-home.js`);
      writeFileSync(script, readFileSync(homeScriptPath, 'utf8'));
      try {
        plant.apply(root, { script });
        const result = spawnSync(process.execPath, [scriptPath, '--dist', root, '--script', script], { encoding: 'utf8' });
        // A fault must make the check fail (exit 1). A harmless change must leave it passing (exit 0).
        // A crash is not a catch: a caught fault prints its problems and nothing on stderr.
        const clean = result.stderr === '' && (plant.expectPass || result.stdout.trim() !== '');
        if (clean && result.status === (plant.expectPass ? 0 : 1)) passed.push(plant.name);
        else missed.push(plant.name);
      } finally {
        rmSync(script, { force: true });
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }

  if (missed.length === 0) {
    console.log(`copy-match selftest: ${passed.length} of ${plants.length} planted cases right`);
  } else {
    for (const name of missed) console.log(`copy-match selftest: planted case wrong: ${name}`);
    console.log(`copy-match selftest: ${passed.length} of ${plants.length} planted cases right`);
    process.exitCode = 1;
  }
}

if (args.includes('--selftest')) {
  runSelftest();
} else {
  report(check(distDir));
}
