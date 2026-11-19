// Proof for the live line schedule engine. Every instant is a fixed ISO string
// with an explicit offset, and every expected value comes from the rule in the
// brief or from the exchange list, never from this engine's own output.
//
// The suite runs in child processes so its answer cannot depend on the zone of
// the machine that runs it. The parent also runs the calendar check once and
// four mutation checks, each under Pacific/Auckland.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const defaultEnginePath = fileURLToPath(new URL('../src/lib/schedule.ts', import.meta.url));
const defaultClosuresPath = fileURLToPath(
  new URL('../src/data/market-closures.json', import.meta.url),
);
const enginePath = process.env.SCHEDULE_ENGINE ?? defaultEnginePath;

const engine = await import(pathToFileURL(enginePath).href);
const { nextEvent, isTradingDay, isEarlyCloseCandidate } = engine;

const CHECK = 'the trading bot checks the market';
const CLOSE = 'the trading bot closes its day';
const LESSONS = "the day's lessons are written down";
const REVIEW = "the trading bot's weekly review";
const SCREENS = 'every screen of the money app is tested end to end';

let passed = 0;
let failed = 0;
const cases = [];

function test(name, fn) {
  cases.push([name, fn]);
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function dayKey(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function expectNext(nowIso, expected, closures) {
  const next = nextEvent(new Date(nowIso), closures);
  assert.equal(next.at.toISOString(), expected.at, 'at');
  assert.equal(next.when, expected.when, 'when');
  assert.equal(next.event, expected.event, 'event');
  assert.equal(next.key, expected.key, 'key');
}

// One trading day: Tuesday July 14 2026, Eastern daylight time.
test('market check just before 10:32', () => {
  expectNext('2026-07-14T14:31:00Z', {
    at: '2026-07-14T14:32:00.000Z',
    when: 'today, 10:32 a.m.',
    event: CHECK,
    key: '2026-07-14T10:32',
  });
});

test('market check just after 10:32', () => {
  expectNext('2026-07-14T14:33:00Z', {
    at: '2026-07-14T19:45:00.000Z',
    when: 'today, 3:45 p.m.',
    event: CLOSE,
    key: '2026-07-14T15:45',
  });
});

test('close just before 15:45', () => {
  expectNext('2026-07-14T19:44:00Z', {
    at: '2026-07-14T19:45:00.000Z',
    when: 'today, 3:45 p.m.',
    event: CLOSE,
    key: '2026-07-14T15:45',
  });
});

test('close just after 15:45', () => {
  expectNext('2026-07-14T19:46:00Z', {
    at: '2026-07-14T22:40:00.000Z',
    when: 'today, 6:40 p.m.',
    event: LESSONS,
    key: '2026-07-14T18:40',
  });
});

test('lessons just before 18:40', () => {
  expectNext('2026-07-14T22:39:00Z', {
    at: '2026-07-14T22:40:00.000Z',
    when: 'today, 6:40 p.m.',
    event: LESSONS,
    key: '2026-07-14T18:40',
  });
});

test('lessons just after 18:40, next day', () => {
  expectNext('2026-07-14T22:41:00Z', {
    at: '2026-07-15T14:32:00.000Z',
    when: 'tomorrow, 10:32 a.m.',
    event: CHECK,
    key: '2026-07-15T10:32',
  });
});

test('weekly review just before 09:05', () => {
  expectNext('2026-07-18T13:04:00Z', {
    at: '2026-07-18T13:05:00.000Z',
    when: 'today, 9:05 a.m.',
    event: REVIEW,
    key: '2026-07-18T09:05',
  });
});

test('weekly review just after 09:05', () => {
  expectNext('2026-07-18T13:06:00Z', {
    at: '2026-07-18T22:40:00.000Z',
    when: 'today, 6:40 p.m.',
    event: LESSONS,
    key: '2026-07-18T18:40',
  });
});

test('screens just before 03:00 on Sunday', () => {
  expectNext('2026-07-19T06:59:00Z', {
    at: '2026-07-19T07:00:00.000Z',
    when: 'today, 3:00 a.m.',
    event: SCREENS,
    key: '2026-07-19T03:00',
  });
});

test('screens just after 03:00 on Sunday', () => {
  expectNext('2026-07-19T07:01:00Z', {
    at: '2026-07-19T22:40:00.000Z',
    when: 'today, 6:40 p.m.',
    event: LESSONS,
    key: '2026-07-19T18:40',
  });
});

// Both daylight-saving changes in 2027.
test('spring forward: 03:00 still happens and is 07:00 UTC', () => {
  expectNext('2027-03-14T06:59:00Z', {
    at: '2027-03-14T07:00:00.000Z',
    when: 'today, 3:00 a.m.',
    event: SCREENS,
    key: '2027-03-14T03:00',
  });
});

test('spring forward: after 03:00 the clocks are on daylight time', () => {
  expectNext('2027-03-14T07:01:00Z', {
    at: '2027-03-14T22:40:00.000Z',
    when: 'today, 6:40 p.m.',
    event: LESSONS,
    key: '2027-03-14T18:40',
  });
});

test('fall back: 03:00 happens once and is 08:00 UTC', () => {
  expectNext('2027-11-07T05:30:00Z', {
    at: '2027-11-07T08:00:00.000Z',
    when: 'today, 3:00 a.m.',
    event: SCREENS,
    key: '2027-11-07T03:00',
  });
});

test('fall back: after 03:00 the clocks are on standard time', () => {
  expectNext('2027-11-07T08:01:00Z', {
    at: '2027-11-07T23:40:00.000Z',
    when: 'today, 6:40 p.m.',
    event: LESSONS,
    key: '2027-11-07T18:40',
  });
});

// Thanksgiving week 2026.
test('Thanksgiving Wednesday evening: next is the holiday lessons, not a market check', () => {
  expectNext('2026-11-25T23:41:00Z', {
    at: '2026-11-26T23:40:00.000Z',
    when: 'tomorrow, 6:40 p.m.',
    event: LESSONS,
    key: '2026-11-26T18:40',
  });
});

test('Thanksgiving Thursday morning is not a trading day', () => {
  assert.equal(isTradingDay(new Date('2026-11-26T14:00:00Z')), false);
  expectNext('2026-11-26T14:00:00Z', {
    at: '2026-11-26T23:40:00.000Z',
    when: 'today, 6:40 p.m.',
    event: LESSONS,
    key: '2026-11-26T18:40',
  });
});

test('Thanksgiving Friday at noon: 15:45 is skipped on an early close', () => {
  assert.equal(isEarlyCloseCandidate(new Date('2026-11-27T17:00:00Z')), true);
  expectNext('2026-11-27T17:00:00Z', {
    at: '2026-11-27T23:40:00.000Z',
    when: 'today, 6:40 p.m.',
    event: LESSONS,
    key: '2026-11-27T18:40',
  });
});

test('Thanksgiving Friday morning keeps the 10:32 market check', () => {
  expectNext('2026-11-27T15:30:00Z', {
    at: '2026-11-27T15:32:00.000Z',
    when: 'today, 10:32 a.m.',
    event: CHECK,
    key: '2026-11-27T10:32',
  });
});

test('Thanksgiving Saturday: weekly review leads', () => {
  expectNext('2026-11-28T10:00:00Z', {
    at: '2026-11-28T14:05:00.000Z',
    when: 'today, 9:05 a.m.',
    event: REVIEW,
    key: '2026-11-28T09:05',
  });
});

test('Friday 16:00: next is the lessons at 18:40', () => {
  expectNext('2026-07-17T20:00:00Z', {
    at: '2026-07-17T22:40:00.000Z',
    when: 'today, 6:40 p.m.',
    event: LESSONS,
    key: '2026-07-17T18:40',
  });
});

test('Saturday 10:00: next is the lessons at 18:40', () => {
  expectNext('2026-07-18T14:00:00Z', {
    at: '2026-07-18T22:40:00.000Z',
    when: 'today, 6:40 p.m.',
    event: LESSONS,
    key: '2026-07-18T18:40',
  });
});

test('Sunday 04:00: next is the lessons at 18:40', () => {
  expectNext('2026-07-19T08:00:00Z', {
    at: '2026-07-19T22:40:00.000Z',
    when: 'today, 6:40 p.m.',
    event: LESSONS,
    key: '2026-07-19T18:40',
  });
});

// New Year's Day on a Saturday (2028) is not observed on the Friday before.
test('New Year 2028 on Saturday leaves Friday December 31 a trading day', () => {
  assert.equal(isTradingDay(new Date('2027-12-31T17:00:00Z')), true);
  expectNext('2027-12-31T15:20:00Z', {
    at: '2027-12-31T15:32:00.000Z',
    when: 'today, 10:32 a.m.',
    event: CHECK,
    key: '2027-12-31T10:32',
  });
});

test('New Year 2028 on Saturday leaves Monday January 3 a trading day', () => {
  assert.equal(isTradingDay(new Date('2028-01-03T17:00:00Z')), true);
});

test('closures follow the rule: Good Friday, observed July 4, Juneteenth and Christmas', () => {
  for (const iso of [
    '2026-04-03T16:00:00Z', // Good Friday
    '2026-07-03T16:00:00Z', // July 4 on Saturday, observed Friday
    '2027-06-18T16:00:00Z', // Juneteenth on Saturday, observed Friday
    '2027-07-05T16:00:00Z', // July 4 on Sunday, observed Monday
    '2027-12-24T16:00:00Z', // Christmas on Saturday, observed Friday
    '2028-01-17T16:00:00Z', // Martin Luther King Jr. Day
    '2028-02-21T16:00:00Z', // Washington's Birthday
    '2028-05-29T16:00:00Z', // Memorial Day
    '2028-09-04T16:00:00Z', // Labor Day
    '2028-11-23T16:00:00Z', // Thanksgiving
  ]) {
    assert.equal(isTradingDay(new Date(iso)), false, `${iso} should be closed`);
  }
  assert.equal(isTradingDay(new Date('2026-04-02T16:00:00Z')), true, 'day before Good Friday');
});

test('early close candidates include July 2 when July 3 is a closure', () => {
  assert.equal(isEarlyCloseCandidate(new Date('2026-07-02T18:00:00Z')), true);
  expectNext('2026-07-02T18:00:00Z', {
    at: '2026-07-02T22:40:00.000Z',
    when: 'today, 6:40 p.m.',
    event: LESSONS,
    key: '2026-07-02T18:40',
  });
});

test('July 3 2028 is an early close, so 15:45 is skipped', () => {
  assert.equal(isEarlyCloseCandidate(new Date('2028-07-03T18:00:00Z')), true);
  expectNext('2028-07-03T18:00:00Z', {
    at: '2028-07-03T22:40:00.000Z',
    when: 'today, 6:40 p.m.',
    event: LESSONS,
    key: '2028-07-03T18:40',
  });
});

test('a normal trading day is not an early close', () => {
  assert.equal(isEarlyCloseCandidate(new Date('2026-11-25T18:00:00Z')), false);
});

// Probes from the review, each expected value derived by hand from the rules.
test('probe: the minute before spring forward', () => {
  expectNext('2027-03-14T01:59:59.999-05:00', {
    at: '2027-03-14T07:00:00.000Z',
    when: 'today, 3:00 a.m.',
    event: SCREENS,
    key: '2027-03-14T03:00',
  });
});

test('probe: exactly 03:00 on spring forward', () => {
  expectNext('2027-03-14T03:00:00-04:00', {
    at: '2027-03-14T22:40:00.000Z',
    when: 'today, 6:40 p.m.',
    event: LESSONS,
    key: '2027-03-14T18:40',
  });
});

test('probe: both readings of 01:30 on fall back', () => {
  expectNext('2027-11-07T01:30:00-04:00', {
    at: '2027-11-07T08:00:00.000Z',
    when: 'today, 3:00 a.m.',
    event: SCREENS,
    key: '2027-11-07T03:00',
  });
  expectNext('2027-11-07T01:30:00-05:00', {
    at: '2027-11-07T08:00:00.000Z',
    when: 'today, 3:00 a.m.',
    event: SCREENS,
    key: '2027-11-07T03:00',
  });
});

test('probe: New Year 2028 on Saturday, after 18:40', () => {
  expectNext('2027-12-31T18:41:00-05:00', {
    at: '2028-01-01T14:05:00.000Z',
    when: 'tomorrow, 9:05 a.m.',
    event: REVIEW,
    key: '2028-01-01T09:05',
  });
});

test('probe: New Year 2029 after 18:40', () => {
  expectNext('2028-12-31T18:41:00-05:00', {
    at: '2029-01-01T23:40:00.000Z',
    when: 'tomorrow, 6:40 p.m.',
    event: LESSONS,
    key: '2029-01-01T18:40',
  });
});

test('probe: a distant spring day after 18:40', () => {
  expectNext('2035-03-22T18:41:00-04:00', {
    at: '2035-03-23T22:40:00.000Z',
    when: 'tomorrow, 6:40 p.m.',
    event: LESSONS,
    key: '2035-03-23T18:40',
  });
});

test('probe: Christmas Eve 2029 at noon', () => {
  expectNext('2029-12-24T12:00:00-05:00', {
    at: '2029-12-24T23:40:00.000Z',
    when: 'today, 6:40 p.m.',
    event: LESSONS,
    key: '2029-12-24T18:40',
  });
});

test('probe: July 2 2032 is a normal trading day', () => {
  expectNext('2032-07-02T14:00:00-04:00', {
    at: '2032-07-02T19:45:00.000Z',
    when: 'today, 3:45 p.m.',
    event: CLOSE,
    key: '2032-07-02T15:45',
  });
});

test('probe: Juneteenth observed on Monday June 20 2033', () => {
  expectNext('2033-06-20T10:00:00-04:00', {
    at: '2033-06-20T22:40:00.000Z',
    when: 'today, 6:40 p.m.',
    event: LESSONS,
    key: '2033-06-20T18:40',
  });
});

test('probe: exactly 10:32 on a trading day', () => {
  expectNext('2026-11-16T10:32:00.000-05:00', {
    at: '2026-11-16T20:45:00.000Z',
    when: 'today, 3:45 p.m.',
    event: CLOSE,
    key: '2026-11-16T15:45',
  });
});

test('probe: the millisecond before 10:32', () => {
  expectNext('2026-11-16T10:31:59.999-05:00', {
    at: '2026-11-16T15:32:00.000Z',
    when: 'today, 10:32 a.m.',
    event: CHECK,
    key: '2026-11-16T10:32',
  });
});

// Every hour of one full week must be answered with today or tomorrow.
test('every hour of one week answers today or tomorrow', () => {
  for (let day = 7; day <= 13; day += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      const iso = `2027-06-${pad(day)}T${pad(hour)}:00:00-04:00`;
      const next = nextEvent(new Date(iso));
      assert.match(next.when, /^(today|tomorrow), /, iso);
    }
  }
});

// A date planted in either closure list changes that day without editing the file.
test('a planted closure removes both market events that day', () => {
  const closures = { closed: ['2026-07-14'], early_close: [] };
  assert.equal(isTradingDay(new Date('2026-07-14T14:00:00Z'), closures), false);
  expectNext(
    '2026-07-14T13:00:00Z',
    {
      at: '2026-07-14T22:40:00.000Z',
      when: 'today, 6:40 p.m.',
      event: LESSONS,
      key: '2026-07-14T18:40',
    },
    closures,
  );
});

test('a planted early close keeps 10:32 and removes 15:45', () => {
  const closures = { closed: [], early_close: ['2026-07-14'] };
  assert.equal(isTradingDay(new Date('2026-07-14T14:00:00Z'), closures), true);
  assert.equal(isEarlyCloseCandidate(new Date('2026-07-14T14:00:00Z'), closures), true);
  expectNext(
    '2026-07-14T14:31:00Z',
    {
      at: '2026-07-14T14:32:00.000Z',
      when: 'today, 10:32 a.m.',
      event: CHECK,
      key: '2026-07-14T10:32',
    },
    closures,
  );
  expectNext(
    '2026-07-14T14:33:00Z',
    {
      at: '2026-07-14T22:40:00.000Z',
      when: 'today, 6:40 p.m.',
      event: LESSONS,
      key: '2026-07-14T18:40',
    },
    closures,
  );
});

let copyCount = 0;

async function importMutant(changes) {
  const source = await readFile(defaultEnginePath, 'utf8');
  let mutated = source;
  for (const [find, replace] of changes) {
    if (!mutated.includes(find)) throw new Error(`source line not found: ${find.trim()}`);
    mutated = mutated.replace(find, replace);
  }
  const dir = await mkdtemp(join(tmpdir(), 'schedule-case-'));
  const lib = join(dir, 'src', 'lib');
  const data = join(dir, 'src', 'data');
  await mkdir(lib, { recursive: true });
  await mkdir(data, { recursive: true });
  await writeFile(join(lib, 'schedule.mts'), mutated);
  await copyFile(defaultClosuresPath, join(data, 'market-closures.json'));
  copyCount += 1;
  const mod = await import(`${pathToFileURL(join(lib, 'schedule.mts')).href}?copy=${copyCount}`);
  await rm(dir, { recursive: true, force: true });
  return mod;
}

// The round-trip guard must catch a formatter that reads afternoon as morning.
test('engine reports failure when the formatter loses the 24-hour clock', async () => {
  const mutant = await importMutant([['  hour12: false,\n', '  hour12: true,\n']]);
  assert.throws(
    () => mutant.nextEvent(new Date('2026-07-14T19:44:00Z')),
    (error) => error.name === 'ScheduleError',
  );
});

// The today/tomorrow guard must catch an event further out than tomorrow.
test('engine reports failure when the next event is not today or tomorrow', async () => {
  const mutant = await importMutant([
    [
      '  if (weekdayOf(date) === 6) {\n    events.push({ hour: 9, minute: 5, event: "the trading bot\'s weekly review" });\n  }\n',
      '',
    ],
    [
      '  events.push({ hour: 18, minute: 40, event: "the day\'s lessons are written down" });\n',
      '',
    ],
  ]);
  assert.throws(
    () => mutant.nextEvent(new Date('2026-07-17T20:00:00Z')),
    (error) => error.name === 'ScheduleError' && /today or tomorrow/.test(error.message),
  );
});

async function runCases() {
  for (const [name, fn] of cases) {
    try {
      await fn();
      passed += 1;
    } catch (error) {
      failed += 1;
      console.error(`FAIL ${name}: ${error.message}`);
    }
  }
}

if (process.env.SCHEDULE_MODE === 'cases') {
  await runCases();
  console.log(`schedule: ${passed} of ${passed + failed} cases pass`);
  process.exitCode = failed > 0 ? 1 : 0;
} else {
  const zones = ['America/New_York', 'Pacific/Auckland', 'UTC'];
  for (const zone of zones) {
    const result = spawnSync(process.execPath, [scriptPath], {
      env: { ...process.env, TZ: zone, SCHEDULE_MODE: 'cases' },
      encoding: 'utf8',
    });
    console.log(`zone ${zone}`);
    const output = (result.stdout ?? '').trim();
    if (output) console.log(output);
    if (result.status !== 0) {
      if (result.stderr) process.stderr.write(result.stderr);
      process.exitCode = 1;
    }
  }

  const calendar = JSON.parse(
    await readFile(new URL('./fixtures/nyse-calendar.json', import.meta.url), 'utf8'),
  );

  function calendarMismatches(mod) {
    const problems = [];
    for (const yearText of Object.keys(calendar.closed)) {
      const year = Number(yearText);
      const closed = new Set(calendar.closed[yearText]);
      const early = new Set(calendar.early_close_1pm[yearText] ?? []);
      for (let month = 1; month <= 12; month += 1) {
        const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
        for (let day = 1; day <= days; day += 1) {
          const key = dayKey(year, month, day);
          const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
          if (weekday === 0 || weekday === 6) continue;
          // 16:00 UTC is late morning in New York on every date, winter or summer.
          const instant = new Date(Date.UTC(year, month - 1, day, 16, 0));
          const expectedTrading = !closed.has(key);
          const trading = mod.isTradingDay(instant);
          if (trading !== expectedTrading) {
            problems.push(
              `${key}: rule says trading=${trading}, exchange list says trading=${expectedTrading}`,
            );
          }
          if (early.has(key) && !mod.isEarlyCloseCandidate(instant)) {
            problems.push(`${key}: exchange list says early close, rule says no`);
          }
        }
      }
    }
    return problems;
  }

  const calendarProblems = calendarMismatches(engine);
  if (calendarProblems.length > 0) {
    for (const problem of calendarProblems) console.log(`calendar: ${problem}`);
    process.exitCode = 1;
  } else {
    const years = Object.keys(calendar.closed).length;
    console.log(`schedule: calendar matches the exchange list for ${years} years`);
  }

  // Mutation checks: each runs the whole case suite under Pacific/Auckland from
  // a fresh temp copy outside the tree.
  const source = await readFile(defaultEnginePath, 'utf8');
  const mutants = [
    { name: 'Good Friday rule removed', changes: [['  add(goodFriday(year));\n', '']] },
    {
      name: 'Saturday observance rule removed',
      changes: [['  if (day === 6) return addDays(date, -1);\n', '']],
    },
    { name: 'timeZone option removed', changes: [['  timeZone: ZONE,\n', '']] },
    {
      name: 'hour12 true instead of false',
      changes: [['  hour12: false,\n', '  hour12: true,\n']],
    },
  ];

  for (const mutant of mutants) {
    let mutated = source;
    let broken = false;
    for (const [find, replace] of mutant.changes) {
      if (!mutated.includes(find)) {
        console.error(`schedule: mutation source line not found: ${mutant.name}`);
        process.exitCode = 1;
        broken = true;
        break;
      }
      mutated = mutated.replace(find, replace);
    }
    if (broken) continue;

    const dir = await mkdtemp(join(tmpdir(), 'schedule-mutant-'));
    try {
      const lib = join(dir, 'src', 'lib');
      const data = join(dir, 'src', 'data');
      await mkdir(lib, { recursive: true });
      await mkdir(data, { recursive: true });
      const mutantPath = join(lib, 'schedule.mts');
      await writeFile(mutantPath, mutated);
      await copyFile(defaultClosuresPath, join(data, 'market-closures.json'));
      const result = spawnSync(process.execPath, [scriptPath], {
        env: {
          ...process.env,
          TZ: 'Pacific/Auckland',
          SCHEDULE_MODE: 'cases',
          SCHEDULE_ENGINE: mutantPath,
        },
        encoding: 'utf8',
      });
      const match = /schedule: (\d+) of (\d+) cases pass/.exec(result.stdout ?? '');
      if (!match) {
        console.error(`schedule: mutation produced no result: ${mutant.name}`);
        if (result.stderr) console.error(result.stderr.split('\n').slice(0, 3).join('\n'));
        process.exitCode = 1;
        continue;
      }
      const total = Number(match[2]);
      const failures = total - Number(match[1]);
      if (failures > 0) {
        console.log(`schedule: mutation caught, ${mutant.name}: ${failures} of ${total} cases fail`);
      } else {
        console.error(`schedule: mutation NOT caught: ${mutant.name}`);
        process.exitCode = 1;
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
}
