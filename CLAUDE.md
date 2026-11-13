# Parvis Labs site

One link that shows what the owner builds with AI and how: the projects, the agent-driven way they are made, and what each one taught.

The plan is in `docs/PLAN.md`. The master copy lives in Notion (Documents, "Parvis Labs site, Plan v0.1"). When the two differ, Notion wins; update the mirror in the same session.

## This repo is public and `main` is live

- The repo is public on GitHub. GitHub Pages serves `main` at the apex domain.
- Every push to `main` publishes. Every file in the repo is readable by anyone, including this one.
- Work on a branch. Merge to `main` only after the review and approval below.
- Nothing goes in git that is not safe to publish: no real names, emails, account numbers, hostnames beyond the site's own domain, keys or tokens. Scan the diff before every commit.

## Review before publishing

1. Every word that will be published gets a read-only Fable review first. The reviewer is never the writer.
2. The owner approves the wording. A recommendation is not an approval.
3. Only then does it merge to `main`.

This covers page copy, project blurbs, alt text, meta tags, file names and anything else a visitor or a search engine can read.

## Disclosure table

What each project may show. When in doubt, leave it out and ask.

| Project | Show? | Guardrail |
| --- | --- | --- |
| Rich Life Dashboard | Feature | Demo household only. Never real household figures |
| Language Coach | Feature, once it runs | The owner's own recordings stay private |
| Frame Board / Egloo | Yes | No home network, doorbell or account details |
| Blackfin | Owner's call, not yet made | No account details, positions or performance unless the owner chooses to share |
| Chicken coop | Yes | The 3D model works well as a visual |
| Atlas | Check first, not yet cleared | Tied to day-job work. Check employer policy before listing. At most a generic description. Never employer data, property names or rates |
| This site | Yes | Its own build log |

A project marked "not yet made" or "not yet cleared" stays off every page, draft and screenshot until the owner says yes.

## DNS and domains

- No DNS change without the owner's yes. That includes records, nameservers, the `CNAME` file, the Pages custom-domain setting and any move to another host.
- The `richlife` subdomain serves a separate live site. It must keep working. Check it before and after any hosting change.
- Read-only lookups (`dig`, `curl -I`) are fine at any time.

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
