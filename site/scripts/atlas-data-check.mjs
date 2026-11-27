import { readFileSync } from 'node:fs';

const file = new URL('../src/data/atlas-demo.json', import.meta.url);
const buckets = ['over90', 'd31to90', 'd8to30', 'last7'];
const fail = (message) => {
  console.error(`atlas data check failed: ${message}`);
  process.exit(1);
};

let data;
try {
  data = JSON.parse(readFileSync(file, 'utf8'));
} catch (error) {
  fail(`cannot read the demo data: ${error.message}`);
}

if (!Array.isArray(data.nights) || data.nights.length !== 7) fail('there must be 7 nights');

const hotelCapacity = data.nights[0].kinds.reduce((sum, kind) => sum + kind.capacity, 0);
if (hotelCapacity !== 150) fail(`the hotel must have 150 rooms, found ${hotelCapacity}`);

let rows = 0;
for (const night of data.nights) {
  for (const field of ['date', 'short', 'long', 'kinds']) {
    if (!night[field]) fail(`${night.date ?? 'a night'}: missing ${field}`);
  }
  // Weekday names only: a printed date would be in the past a week after publishing.
  if (/\d/.test(`${night.short} ${night.long}`)) fail(`${night.date}: a night name carries a date`);
  if (!Array.isArray(night.kinds) || night.kinds.length !== 3) fail(`${night.date}: there must be 3 room kinds`);
  let booked = 0;
  let left = 0;
  for (const kind of night.kinds) {
    rows += 1;
    for (const field of ['name', 'capacity', 'booked', 'ahead']) {
      if (kind[field] === undefined) fail(`${night.date} ${kind.name ?? ''}: missing ${field}`);
    }
    if (!Number.isInteger(kind.capacity) || kind.capacity <= 0) fail(`${night.date} ${kind.name}: capacity must be a positive integer`);
    if (!Number.isInteger(kind.booked) || kind.booked < 0) fail(`${night.date} ${kind.name}: booked must be a non-negative integer`);
    if (kind.booked > kind.capacity) fail(`${night.date} ${kind.name}: booked ${kind.booked} is above capacity ${kind.capacity}`);
    const sum = buckets.reduce((total, key) => {
      const value = kind.ahead[key];
      if (!Number.isInteger(value) || value < 0) fail(`${night.date} ${kind.name}: ${key} must be a non-negative integer`);
      return total + value;
    }, 0);
    if (sum !== kind.booked) fail(`${night.date} ${kind.name}: buckets sum to ${sum}, booked is ${kind.booked}`);
    left += kind.capacity - kind.booked;
    booked += kind.booked;
  }
  if (booked + left !== 150) fail(`${night.date}: the room kinds do not add up to 150`);
}

console.log(`atlas data ok: ${data.nights.length} nights, ${rows} rows`);
