# Parvis Labs site

Three commands prove the build. Run them from this folder.

- `npm run build` builds the static site into `dist/` and prints Astro's build summary.
- `npm run shots` serves `dist/`, screenshots every page at 390 and 1440 wide into `.shots/`, and prints `shots: <N> pages x 2 widths, 0 console errors, 0 failed requests` and `shots: live line falls back to the server sentence when the clock fails`. It needs `npx playwright install chromium` once on a machine without Chrome.
- `npm run check` reads every built page and prints `check: 0 problems`, or one line per problem.
- `npm run check:release` runs the same checks and also fails on any project still marked `draft: true`.
- `npm run check:selftest` plants one fault per check against temp copies of the pages and of the projects folder, then prints `selftest: <N> of <N> planted faults caught`.
- `npm run test:schedule` checks the live line engine against the exchange calendar, runs the cases in three zones, and prints the mutation checks.
- `npm run proof` runs every command above in order and stops at the first failure. Its exit code is the result.
- `npm run copy:match` checks that every sentence of the reviewed draft is on its built page, and that no project page adds a sentence.
- `npm run copy:selftest` plants five copy faults one at a time and prints `copy-match selftest: 5 of 5 planted faults caught`.

`node scripts/check.mjs --projects <dir>` checks another projects folder. `node scripts/check-selftest.mjs --projects <dir>` uses another projects folder as its source.

`src/data/market-closures.json` is where an unplanned closure or early close is entered.

`PUBLIC_CONTACT_EMAIL` adds the contact link when the build sets it. With it unset, no link and no address appears.
