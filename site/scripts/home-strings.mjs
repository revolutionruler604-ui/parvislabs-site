// Everything a visitor, a screen reader or a search engine can get from the home page,
// as a flat list of strings. copy-match.mjs compares this list with the approved seed.

export function decodeExact(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

export function tidy(text) {
  return text.replace(/\s+/g, ' ').trim();
}

// Quotes are NOT straightened here: the home seed is copied exactly.
export function htmlUnits(html) {
  const clean = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    // A drawing label set on two lines is one string: its tspans join.
    .replace(/<\/?tspan\b[^>]*>/gi, '');
  const nodes = [];
  for (const match of clean.matchAll(/>([^<]*)</g)) {
    const text = tidy(decodeExact(match[1]));
    if (text) nodes.push({ text, at: match.index });
  }
  const attributes = [];
  for (const match of clean.matchAll(/\s(alt|aria-label|title|data-no|data-u|data-d)="([^"]*)"/gi)) {
    const text = tidy(decodeExact(match[2]));
    if (text) attributes.push({ text, name: match[1].toLowerCase(), at: match.index });
  }
  const meta = /<meta[^>]+name="description"[^>]*content="([^"]*)"/i.exec(clean);
  const description = meta ? tidy(decodeExact(meta[1])) : '';
  return { nodes, attributes, description, clean };
}

// Words built from data (src/data/blackfin.json) or from the route, turned into a
// fixed shape on both sides of the comparison. Only whole sentences of exactly the
// known shape are masked; any other change in them is a different string and fails.
const MONTH = '(?:January|February|March|April|May|June|July|August|September|October|November|December)';
const SINCE = new RegExp(
  `^Since ${MONTH} \\d{1,2} it has looked at \\d+ stocks?, refused \\d+ orders? and made \\d+ trades?\\.$`,
);
const AS_OF = new RegExp(`^As of ${MONTH} \\d{1,2}, \\d{4}\\.$`);
const ROUND_BEFORE = 'Three ports made. That is';

export function maskAll(strings) {
  return strings.map((text, index) => {
    if (SINCE.test(text)) {
      return 'Since {date} it has looked at {n} stock(s), refused {n} order(s) and made {n} trade(s).';
    }
    if (AS_OF.test(text)) return 'As of {date}.';
    // Blackfin's one figure moves with the account; only its shape is fixed.
    if (/^[+\u2212]?\d+\.\d{2}%$/.test(text)) return '{pct}';
    // The percent of the way round is computed from the route in home.js.
    if (/^\d+$/.test(text) && strings[index - 1] === ROUND_BEFORE) return '{n}';
    return text;
  });
}

// ---------- strings inside home.js ----------

// Strings that are code, not words. Anything else that looks like words and is not in a
// known message place stops the check, so a new message cannot slip in unseen.
const NOT_WORDS = new Set([
  '(prefers-reduced-motion: reduce)',
  '(prefers-color-scheme: dark)',
  'http://www.w3.org/2000/svg',
  'America/New_York',
  '0 0 ',
  '#page .knot',
  'canvas.globe',
  'viewBox',
  'Sphere',
  'LineString',
  'ResizeObserver',
  'mailto:',
  'translateY(',
  'transform 300ms cubic-bezier(.77,0,.175,1)',
  'transform 700ms cubic-bezier(.23,1,.32,1), opacity 700ms',
  'opacity 400ms',
  'px "Zen Kaku Gothic New",sans-serif',
]);

const MESSAGE_CONTEXT = /\.textContent\s*=|\btell\(|\bconst BACK\s*=|\bconst yes\s*=|\b(?:name|place):\s*$/;

export function scriptLiterals(source) {
  const found = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    if (c === '/' && source[i + 1] === '/') {
      while (i < source.length && source[i] !== '\n') i += 1;
      continue;
    }
    if (c === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      i = end === -1 ? source.length : end + 2;
      continue;
    }
    if (c === "'" || c === '"') {
      let j = i + 1;
      let value = '';
      while (j < source.length && source[j] !== c) {
        if (source[j] === '\\') {
          value += source[j + 1];
          j += 2;
        } else {
          value += source[j];
          j += 1;
        }
      }
      found.push({ value, at: i });
      i = j + 1;
      continue;
    }
    if (c === '`') throw new Error('home.js uses a template string; home-strings.mjs cannot read it');
    i += 1;
  }
  return found;
}

export function scriptStrings(source) {
  const problems = [];
  if (/innerHTML|outerHTML|insertAdjacentHTML|\.innerText|\.insertAdjacent|createTextNode|\.title\s*=|\.alt\s*=|\.ariaLabel\s*=/.test(source)) {
    problems.push('home.js sets words in a way the check cannot read (innerHTML, innerText, createTextNode, title, alt or ariaLabel)');
  }
  if (/setAttribute\(\s*['"](?:aria-label|title|alt|aria-description)['"]/.test(source)) {
    problems.push('home.js sets an aria-label, title or alt through setAttribute, which the check cannot read');
  }
  const messages = [];
  const labels = [];
  for (const lit of scriptLiterals(source)) {
    const text = tidy(lit.value);
    const before = source.slice(Math.max(source.lastIndexOf(';', lit.at), source.lastIndexOf('{', lit.at), source.lastIndexOf('}', lit.at)) + 1, lit.at);
    const labelKind = /\b(name|place):\s*$/.test(before);
    if (labelKind) labels.push(text);
    else if (MESSAGE_CONTEXT.test(before)) {
      if (text) messages.push(text);
    } else if (!NOT_WORDS.has(lit.value) && /[A-Z][a-z]|[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(lit.value)) {
      problems.push(`home.js has a string outside the known message places: ${lit.value}`);
    }
  }
  return { messages, labels, problems };
}

export function readSeed(text) {
  const lines = [];
  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    if (/^#\s/.test(raw)) continue;
    const line = tidy(raw);
    if (line) lines.push(line);
  }
  return lines;
}
