# Parvis Labs site: Plan v0.1

Mirror of the Notion plan (Documents, "Parvis Labs site, Plan v0.1"), taken Nov 12 2026. Notion stays the master copy. Status: draft.

This repo is public, so the mirror leaves out real names and the employer's name. Nothing else is changed except the "Found on Nov 12 2026" section, which is new.

## Goal

One link that shows what the owner builds with AI and how. A living exhibition of the projects, the agent-driven way they are made, and what each one taught. The domain is registered. The `richlife` subdomain already serves the Rich Life invite page.

## Audience and job

- People the owner sends the link to: hiring managers, collaborators, possible partners or investors, peers in AI.
- In 30 seconds they should get: who the owner is, what has been built, that it is real (screens, demos, numbers that can be shared), and how it gets built (an owner plus a team of agents).

## Positioning (draft, not approved)

> Parvis Labs: products built by one owner and a team of AI agents. A revenue manager by day who ships real software at night: a finance app for households, a trading bot, a home dashboard, a language coach.

The point that sets it apart is not "I use AI". It is the operating model: architect, builder and reviewer agents, gates that prove each change works, decisions logged. Few people can show that working end to end.

## Site map v1

- **Home:** positioning, 3 to 4 featured project cards, one line on how the work gets done.
- **Projects:** one page per project, the same shape each time: the problem, what it does, screens or a demo, how it was built, status, what was learned.
- **How I work:** the agent operating model (lanes, gates, reviews, the Notion memory). This is the differentiator; give it a real page.
- **Log:** short build notes (optional at launch).
- **About and contact.**

## Project lineup and what is safe to show

| Project | Show? | Guardrail |
| --- | --- | --- |
| Rich Life Dashboard | Feature | Demo household only. Never real household figures |
| Language Coach | Feature (once it runs) | The owner's own recordings stay private |
| Frame Board / Egloo | Yes | No home network, doorbell or account details |
| Blackfin | Owner's call | No account details, positions or performance unless the owner chooses to share |
| Chicken coop | Yes, fun | The 3D model renders well as a visual |
| Atlas | **Check first** | Tied to day-job work. Check employer policy before listing; at most a generic description, never employer data |
| This site | Yes | Its own build log |

## Stack and hosting (recommendation)

- **Astro**, a static site with a content collection per project (Markdown plus a few fields: status, stack, links, featured). Fast, cheap, easy for agents to edit.
- **Hosting:** Cloudflare Pages or Vercel, both free at this size. The choice depends on where the domain's DNS lives now. **Check before touching DNS: the `richlife` subdomain must keep working.**
- **Design:** the design-taste-frontend skill for art direction, so it does not look like a template. Light and dark, phone first.
- **Tying it together:** each project repo gets a `SHOWCASE.md` (a short, safe-to-publish summary and status). The site reads those, so the site stays current as projects move. Each project's session proposes changes to its own entry; the site session publishes.

## Phases (each opens with its proof)

**Phase 0: Content and direction.** Interview the owner (20 min), draft the positioning and project blurbs, choose an art direction from 2 to 3 options. Proof: a one-page wireframe and the copy in Notion, approved.

**Phase 1: Build locally.** Proof: `npm run build` passes, and a Playwright script screenshots every page at phone and desktop width with no console errors.

**Phase 2: Go live.** Deploy to a preview URL, then the apex domain. Proof: the apex domain loads over HTTPS and the `richlife` subdomain still works. **The DNS change needs the owner's yes.**

**Phase 3: `SHOWCASE.md` in each project and a page per project.**

## Rules

- Every word published goes through a read-only Fable review, and the owner approves the wording (existing Rich Life rule, extended to this site).
- No personal contact details beyond what the owner picks.
- No analytics that track visitors across sites. At most a privacy-friendly page counter.

## Repo scaffold

```
CLAUDE.md          rules above, the disclosure table, review before publishing
docs/PLAN.md       this plan, mirrored; Notion stays the master copy
docs/content/      positioning and blurbs, drafted then approved
site/              the Astro project, created in Phase 1
```

## Found on Nov 12 2026 (not in the Notion plan yet)

Read-only checks from the first session. They change Phase 2.

- **The apex is already live.** This repo holds a one-page site (`index.html`, self-hosted fonts, a `CNAME` file) and GitHub Pages serves it from `main` at the apex domain. Phase 2 is a replacement of a live page, not a first launch.
- **DNS is on Cloudflare** (the nameservers are Cloudflare's). The apex and `www` point at GitHub Pages. The `richlife` subdomain is a CNAME to a separate GitHub Pages site.
- **The repo is public.** Every committed file is readable, and Pages may also serve Markdown files as pages. Planning files pushed to `main` are published.
- **A no-DNS route exists.** Building the Astro site with a GitHub Action and serving it from GitHub Pages keeps every DNS record as it is. Moving to Cloudflare Pages or Vercel needs a DNS change and the owner's yes.

## Open decisions for the owner

1. **Atlas:** list it, describe it generically, or leave it out until employer policy is checked? Recommendation: leave it out of v1.
2. **Blackfin:** show it, and how much?
3. **Name on the site:** full name, or Parvis Labs only?
4. **Where DNS lives now.** Lookup done: Cloudflare. The owner only confirms.
5. **New: planning files in a public repo.** Push this scaffold to `main` as is, keep it on a branch, or make the repo private first?
6. **New: hosting route.** Stay on GitHub Pages (no DNS change) or move to Cloudflare Pages or Vercel (DNS change)?
