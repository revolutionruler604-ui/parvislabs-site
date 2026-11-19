# Parvis Labs site

One link that shows what the owner builds with AI and how: the projects, the agent-driven way they are made, and what each one taught.

The plan is in `docs/PLAN.md`. The master copy lives in Notion (Documents, "Parvis Labs site, Plan v0.1"). When the two differ, Notion wins; update the mirror in the same session.

## This repo is public and `main` is live

- The repo is public on GitHub. GitHub Pages serves `main` at the apex domain.
- Every push to `main` publishes. Every file in the repo is readable by anyone, including this one.
- Work on a branch. Merge to `main` only after the review and approval below.
- Nothing goes in git that is not safe to publish: no real names, emails, account numbers, hostnames beyond the site's own domain, keys or tokens. Scan the diff before every commit.
- GitHub Pages builds `main` from the repo root with its older builder, so every file on `main` gets an address under the apex domain. Until the apex moves to Cloudflare, only the live page's own files go on `main`. Check with `gh api repos/{owner}/{repo}/pages` before any push to `main`.
- A pushed branch publishes its whole history. Lane history stays on the build machine; work reaches GitHub as one squashed commit, after scanning `git log -p` for anything the disclosure table forbids.

## Review before publishing

1. Every word that will be published gets a read-only review first, by a model other than the one that wrote it. The reviewer is never the writer.
2. That review is enough to merge (decided Nov 14 2026). The owner approves only a huge change: a ground-up rework, a new page or project, a change to what a project may show, or anything that touches DNS or hosting. A recommendation is not an approval.
3. Only then does it merge to `main`.

This covers page copy, project blurbs, alt text, meta tags, file names and anything else a visitor or a search engine can read.

## Disclosure table

What each project may show. When in doubt, leave it out and ask. This table is the authority: when it changes, PRODUCT.md and `site/scripts/check.mjs` change in the same commit.

| Project | Show? | Guardrail |
| --- | --- | --- |
| Rich Life Dashboard | Feature | Demo household only. Never real household figures |
| Language Coach | Feature, once it runs | The owner's own recordings stay private |
| Frame Board / Egloo | Yes | No home network, doorbell or account details |
| Blackfin | Feature (decided Nov 12 2026, widened Nov 13 2026) | The method, the idea behind it, counts of stocks read, orders refused and trades made, and one percent figure for the account, which may be negative, shown live and refreshed each minute (Nov 14 2026). Never the value of the account, any dollar amount, the starting amount, tickers, share counts, account numbers, keys or broker logins |
| Chicken coop | No (removed Nov 13 2026) | Not on the site |
| Atlas | In the lab, a brief glimpse only (decided Nov 12 2026, demo added Nov 14 2026) | A short description of a three-dimensional analysis engine for hotel revenue management, plus one small demo on an invented hotel whose every number is made up, captioned as such. The public version will rest on the owner's own knowledge and be independent of any employer data. No employer name, data, property names, rates or any money figure, internal terms, or screens made from real work data |
| This site | Yes | Its own build log |

The name on the site is "Parvis Labs", with the line "Founder Sachin Kumar". That is the only personal name the site carries.

The home page is a voyage (decided Nov 14 2026): the projects are ports on a real round-the-world route, drawn on a real globe. The founder is the captain and the agents are the ship. No historical person is named anywhere a visitor can read. The contact address is the hello address only.

## DNS and domains

- No DNS change without the owner's yes. That includes records, nameservers, the `CNAME` file, the Pages custom-domain setting and any move to another host.
- The `richlife` subdomain serves a separate live site. It must keep working. Check it before and after any hosting change.
- Read-only lookups (`dig`, `curl -I`) are fine at any time.
- Hosting direction (decided Nov 12 2026): move to Cloudflare Pages, for a preview link on every branch. DNS is on a Cloudflare account the owner controls. The move itself still waits for a yes on the exact records to change.

## Privacy

- No personal contact details beyond what the owner picks.
- No analytics that track visitors across sites. At most a privacy-friendly page counter.
- Fonts and scripts are served from this repo, not from a third party.

## Proof

Each phase opens with the command that proves it works.

- Phase 1 (build): `npm run build` passes, and a Playwright script screenshots every page at phone and desktop width with no console errors.
- Phase 2 (live): the apex domain loads over HTTPS and the `richlife` subdomain still works.

Unit tests alone are not proof.

## Writing

Plain US English. Short sentences. No em dashes. No jargon or builder words in anything a visitor sees. Use they/them for anyone whose pronouns are not stated. Cut taglines and helper text; if a page needs them, fix the layout.

## Layout

```
CLAUDE.md          these rules
docs/PLAN.md       the plan, mirrored from Notion
docs/content/      positioning and blurbs, drafted then approved (Phase 0)
site/              the Astro project (Phase 1)
index.html, fonts/, CNAME    the page that is live today
```

Design work uses the design-taste-frontend skill. Light and dark, phone first.
