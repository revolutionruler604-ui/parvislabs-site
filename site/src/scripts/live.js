// When a Blackfin reading counts as live: read within the last three minutes, and stamped no more
// than a minute ahead of this clock. home.js uses it; scripts/test-live.mjs tests it.
export const isLive = (nowMs, atMs) => {
  const age = nowMs - atMs;
  return age > -60000 && age < 180000;
};
