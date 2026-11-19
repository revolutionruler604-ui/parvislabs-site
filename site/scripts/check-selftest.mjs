import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dist = join(siteRoot, 'dist');
const checker = fileURLToPath(new URL('./check.mjs', import.meta.url));
const cli = process.argv.slice(2);
function argument(name) {
  const inline = cli.find((value) => value.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = cli.indexOf(name);
  return index === -1 ? undefined : cli[index + 1];
}
const projectsSource = resolve(
  argument('--projects') ?? process.env.CHECK_PROJECTS ?? join(siteRoot, 'src', 'content', 'projects'),
);
const seedPath = resolve(siteRoot, '..', '.seed', 'principles.json');
const dataPath = join(siteRoot, 'src', 'data', 'principles.json');
const principlesPath = existsSync(seedPath) ? seedPath : dataPath;
const principles = JSON.parse(await readFile(principlesPath, 'utf8'));
const firstBody = principles.groups[0].items[0].body;

async function walk(dir, suffix) {
  const out = [];
  for (const name of await readdir(dir)) {
    const full = join(dir, name);
    if ((await stat(full)).isDirectory()) out.push(...(await walk(full, suffix)));
    else if (name.endsWith(suffix)) out.push(full);
  }
  return out;
}

async function edit(file, change) {
  await writeFile(file, change(await readFile(file, 'utf8')));
}

async function setDraft(file, value) {
  await edit(file, (raw) => {
    const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
    if (!match) return raw;
    let head = match[1];
    if (/^draft\s*:/im.test(head)) head = head.replace(/^draft\s*:.*$/im, `draft: ${value}`);
    else head = `${head}\ndraft: ${value}`;
    const end = match.index + match[0].length;
    return `${raw.slice(0, match.index)}---\n${head}\n---${raw.slice(end)}`;
  });
}

function beforeBody(snippet) {
  return (html) => html.replace('</body>', `${snippet}</body>`);
}

async function home(dir) {
  return join(dir, 'index.html');
}

const address = (user, domain) => [user, domain].join('@');

const tests = [
  {
    name: 'em dash character',
    plant: (dir) => edit(join(dir, 'index.html'), beforeBody('\u2014')),
    expect: ['em dash'],
  },
  {
    name: 'em dash &mdash;',
    plant: (dir) => edit(join(dir, 'index.html'), beforeBody('&mdash;')),
    expect: ['em dash'],
  },
  {
    name: 'em dash &#8212;',
    plant: (dir) => edit(join(dir, 'index.html'), beforeBody('&#8212;')),
    expect: ['em dash'],
  },
  {
    name: 'em dash &#X2014;',
    plant: (dir) => edit(join(dir, 'index.html'), beforeBody('&#X2014;')),
    expect: ['em dash'],
  },
  {
    name: 'banned word',
    plant: (dir) => edit(join(dir, 'index.html'), beforeBody('revolutionary')),
    expect: ['banned word'],
  },
  {
    name: 'performance figure, percent',
    plant: (dir) => edit(join(dir, 'index.html'), beforeBody('It made 2 trades. It is down 1.0% so far.')),
    expect: ['performance figure'],
  },
  {
    name: 'performance figure, account',
    plant: (dir) => edit(join(dir, 'index.html'), beforeBody('The account is unchanged.')),
    expect: ['performance figure'],
  },
  {
    name: 'Atlas, a rate',
    plant: (dir) => edit(join(dir, 'work', 'atlas', 'index.html'), beforeBody('<p>King at $289.</p>')),
    expect: ['money figure on the Atlas page'],
  },
  {
    name: 'Atlas, caption gone',
    plant: (dir) => edit(join(dir, 'work', 'atlas', 'index.html'), (html) => html.replace('Every number here is made up.', 'Every number here is real.')),
    expect: ['Atlas demo without its made-up caption'],
  },
  {
    name: 'placeholder text',
    plant: (dir) => edit(join(dir, 'index.html'), beforeBody('TODO')),
    expect: ['placeholder text'],
  },
  {
    name: 'foreign src',
    plant: (dir) => edit(join(dir, 'index.html'), beforeBody('<img src="https://evil.example/x.png" alt="x">')),
    expect: ['foreign src'],
  },
  {
    name: 'foreign srcset',
    plant: (dir) =>
      edit(join(dir, 'index.html'), beforeBody('<img srcset="https://evil.example/x.png 1x" alt="x">')),
    expect: ['foreign srcset'],
  },
  {
    name: 'foreign stylesheet',
    plant: (dir) =>
      edit(join(dir, 'index.html'), beforeBody('<link rel="stylesheet" href="https://evil.example/x.css">')),
    expect: ['foreign stylesheet'],
  },
  {
    name: 'foreign link',
    plant: (dir) =>
      edit(join(dir, 'index.html'), beforeBody('<link rel="preconnect" href="https://evil.example">')),
    expect: ['foreign link'],
  },
  {
    name: 'foreign script src',
    plant: (dir) =>
      edit(join(dir, 'index.html'), beforeBody('<script src="https://evil.example/x.js"></script>')),
    expect: ['foreign <script src>'],
  },
  {
    name: 'foreign iframe src',
    plant: (dir) =>
      edit(join(dir, 'index.html'), beforeBody('<iframe src="https://evil.example/x"></iframe>')),
    expect: ['foreign <iframe src>'],
  },
  {
    name: 'foreign video src',
    plant: (dir) =>
      edit(join(dir, 'index.html'), beforeBody('<video src="https://evil.example/x.mp4"></video>')),
    expect: ['foreign <video src>'],
  },
  {
    name: 'foreign audio src',
    plant: (dir) =>
      edit(join(dir, 'index.html'), beforeBody('<audio src="https://evil.example/x.mp3"></audio>')),
    expect: ['foreign <audio src>'],
  },
  {
    name: 'foreign source src',
    plant: (dir) =>
      edit(
        join(dir, 'index.html'),
        beforeBody('<video><source src="https://evil.example/x.mp4"></video>'),
      ),
    expect: ['foreign <source src>'],
  },
  {
    name: 'foreign object data',
    plant: (dir) =>
      edit(join(dir, 'index.html'), beforeBody('<object data="https://evil.example/x.swf"></object>')),
    expect: ['foreign <object data>'],
  },
  {
    name: 'foreign style url',
    plant: (dir) =>
      edit(join(dir, 'index.html'), beforeBody('<style>body{background:url(https://evil.example/x.png)}</style>')),
    expect: ['foreign style url'],
  },
  {
    name: 'foreign style import',
    plant: (dir) =>
      edit(join(dir, 'index.html'), beforeBody('<style>@import "https://evil.example/x.css";</style>')),
    expect: ['foreign style url'],
  },
  {
    name: 'foreign inline style url',
    plant: (dir) =>
      edit(
        join(dir, 'index.html'),
        beforeBody('<div style="background:url(https://evil.example/x.png)">x</div>'),
      ),
    expect: ['foreign style url'],
  },
  {
    name: 'foreign css file url',
    plant: async (dir) => {
      const [file] = await walk(dir, '.css');
      await edit(file, (css) => `${css}\n@import url("https://evil.example/x.css");\n`);
    },
    expect: ['foreign style url'],
  },
  {
    name: 'email address',
    plant: (dir) => edit(join(dir, 'index.html'), beforeBody(address('someone', 'example.org'))),
    expect: ['email address'],
  },
  {
    name: 'email not the allowed address',
    env: { PUBLIC_CONTACT_EMAIL: address('contact', 'example.org') },
    plant: (dir) => edit(join(dir, 'index.html'), beforeBody(address('someone', 'example.net'))),
    expect: ['email address'],
  },
  {
    name: 'allowed email address',
    clean: true,
    env: { PUBLIC_CONTACT_EMAIL: address('contact', 'example.org') },
    plant: (dir) => edit(join(dir, 'index.html'), beforeBody(address('contact', 'example.org'))),
    expect: [],
  },
  {
    name: 'ordinary link to another site',
    clean: true,
    plant: (dir) =>
      edit(join(dir, 'index.html'), beforeBody('<a href="https://example.org/">other site</a>')),
    expect: [],
  },
  {
    name: 'h1 count',
    plant: (dir) =>
      edit(join(dir, 'index.html'), (html) => html.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi, '')),
    expect: ['0 h1 elements'],
  },
  {
    name: 'missing title',
    plant: (dir) => edit(join(dir, 'index.html'), (html) => html.replace(/<title>[\s\S]*?<\/title>/i, '')),
    expect: ['missing title'],
  },
  {
    name: 'duplicate title',
    plant: async (dir) => {
      const title = /<title>([\s\S]*?)<\/title>/i.exec(await readFile(join(dir, 'index.html'), 'utf8'))[1];
      await edit(join(dir, 'method', 'index.html'), (html) =>
        html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`),
      );
    },
    expect: ['duplicate title'],
  },
  {
    name: 'missing meta description',
    plant: (dir) =>
      edit(join(dir, 'index.html'), (html) =>
        html.replace(/<meta\b[^>]*\bname="description"[^>]*>/i, ''),
      ),
    expect: ['missing meta description'],
  },
  {
    name: 'principle body mismatch',
    plant: (dir) =>
      edit(join(dir, 'principles', 'index.html'), (html) => html.replace(firstBody, 'Changed body.')),
    expect: ['principle body does not match the seed'],
  },
  {
    name: 'link to a page that is not built',
    plant: async (dir) => edit(await home(dir), beforeBody('<a href="/no-such-page/">Nowhere</a>')),
    expect: ['link to a page that is not built "/no-such-page/"'],
  },
  {
    name: 'link to an anchor another page does not have',
    plant: async (dir) => edit(await home(dir), beforeBody('<a href="/method/#no-such-anchor">Nowhere</a>')),
    expect: ['link to an anchor that is not on the page "/method/#no-such-anchor"'],
  },
  {
    name: 'link to an anchor this page does not have',
    plant: async (dir) => edit(await home(dir), beforeBody('<a href="#no-such-anchor">Nowhere</a>')),
    expect: ['link to an anchor that is not on the page "#no-such-anchor"'],
  },
  {
    name: 'no HTML pages',
    plant: async (dir) => {
      for (const file of await walk(dir, '.html')) await rm(file);
    },
    expect: ['no HTML pages'],
  },
  {
    name: 'missing home page',
    plant: (dir) => rm(join(dir, 'index.html')),
    expect: ['home page index.html is missing'],
  },
  {
    name: 'missing principles page',
    plant: (dir) => rm(join(dir, 'principles', 'index.html')),
    expect: ['principles page principles/index.html is missing'],
  },
  {
    name: 'all projects released',
    release: true,
    clean: true,
    projects: true,
    plant: async (_dir, projects) => {
      for (const file of await walk(projects, '.md')) await setDraft(file, false);
    },
    expect: [],
  },
  {
    name: 'one draft project in release',
    release: true,
    projects: true,
    plant: async (_dir, projects, test) => {
      const files = (await walk(projects, '.md')).sort();
      for (const file of files) await setDraft(file, false);
      const target = files[0];
      await setDraft(target, true);
      test.expect.push(basename(target));
    },
    expect: ['draft project'],
    counts: [{ text: 'draft project', count: 1 }],
  },
];

const env = { ...process.env };
delete env.PUBLIC_CONTACT_EMAIL;

const root = await mkdtemp(join(tmpdir(), 'parvis-check-selftest-'));
const missed = [];

try {
  for (const [index, test] of tests.entries()) {
    const dir = join(root, String(index));
    await cp(dist, dir, { recursive: true });
    const projects = join(dir, 'projects');
    if (test.projects) await cp(projectsSource, projects, { recursive: true });
    await test.plant(dir, projects, test);
    const args = [checker, dir];
    if (test.release) args.push('--release');
    if (test.projects) args.push('--projects', projects);
    const run = spawnSync(process.execPath, args, {
      encoding: 'utf8',
      env: { ...env, ...(test.env ?? {}) },
    });
    const output = `${run.stdout ?? ''}${run.stderr ?? ''}`;
    const failed = run.status !== 0;
    const named = test.expect.every((line) => output.includes(line));
    const counted = (test.counts ?? []).every(
      ({ text, count }) => output.split(text).length - 1 === count,
    );
    const clean = !test.clean || (run.status === 0 && !output.includes('problem:'));
    const caught = test.clean ? clean : failed && named && counted;
    if (caught) console.log(`caught: ${test.name}`);
    else {
      missed.push(test.name);
      console.log(`missed: ${test.name}`);
    }
  }
} finally {
  await rm(root, { recursive: true, force: true });
}

console.log(`selftest: ${tests.length - missed.length} of ${tests.length} planted faults caught`);
if (missed.length > 0) process.exitCode = 1;
