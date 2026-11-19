---
name: Parvis Labs
description: One link for a studio run by one founder and a crew of AI agents. Plaster ground, ink, one line, one blue.
colors:
  plaster: "#e7e2d6"
  ink: "#1a1a18"
  muted: "#5f584e"
  line: "#2a2f28"
  accent: "#2e4a8c"
  accent-deep: "#223a72"
  on-accent: "#e7e2d6"
  device: "#2a2f28"
  screen-backing: "#1c1814"
  night-plaster: "#1b1e1a"
  night-ink: "#e7e2d6"
  night-muted: "#b8b09f"
  night-line: "#cfc8b8"
  night-accent: "#93a9ec"
  night-accent-deep: "#7790de"
  night-on-accent: "#1a1a18"
  night-device: "#0b0c0a"
typography:
  display:
    fontFamily: "Kaisei Opti, Hiragino Mincho ProN, Yu Mincho, serif"
    fontSize: "clamp(2.6rem, 5.3vw, 4.75rem)"
    fontWeight: 400
    lineHeight: 1.08
    letterSpacing: "-0.012em"
  headline:
    fontFamily: "Kaisei Opti, Hiragino Mincho ProN, Yu Mincho, serif"
    fontSize: "clamp(2.3rem, 4.4vw, 3.9rem)"
    fontWeight: 400
    lineHeight: 1.06
    letterSpacing: "-0.012em"
  title:
    fontFamily: "Kaisei Opti, Hiragino Mincho ProN, Yu Mincho, serif"
    fontSize: "clamp(1.35rem, 2.1vw, 1.85rem)"
    fontWeight: 400
    lineHeight: 1.32
  body:
    fontFamily: "Zen Kaku Gothic New, Hiragino Sans, Yu Gothic, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.6
  small:
    fontFamily: "Zen Kaku Gothic New, Hiragino Sans, Yu Gothic, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Zen Kaku Gothic New, Hiragino Sans, Yu Gothic, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.6
rounded:
  device: "10px"
  plate: "12px"
  pill: "999px"
  focus: "6px"
spacing:
  gap: "24px"
  gutter: "clamp(20px, 4.4vw, 64px)"
  channel: "120px"
  section: "clamp(96px, 13vw, 190px)"
  inner-section: "clamp(88px, 10vw, 150px)"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.pill}"
    padding: "0.95em 1.5em"
  button-primary-hover:
    backgroundColor: "{colors.accent-deep}"
  button-segment-selected:
    backgroundColor: "{colors.line}"
    textColor: "{colors.plaster}"
    rounded: "{rounded.pill}"
    height: "44px"
  drop-button:
    backgroundColor: "{colors.line}"
    rounded: "{rounded.pill}"
    size: "84px"
  plate:
    rounded: "{rounded.plate}"
  tv-frame:
    backgroundColor: "{colors.device}"
    rounded: "{rounded.device}"
---

# Design System: Parvis Labs

## Overview

**Creative North Star: "The Chart Room"**

The site is a chart drawn on plaster. One ink line runs down the page like a thread on a map. Products sit on it as ports. Everything else is words, a few honest pictures of real screens, and room to breathe. There are no boxes, cards or rules between sections. The line does the separating.

The idea of the home page is a voyage. The founder is the captain. The agents are the ship. The ports are the products, laid on a real round-the-world route that is drawn as the thread and as a globe. The page motto is "Sic parvis magna." The voyage borrows a historical route, and that sea captain is never named anywhere on the site. The founder is the only person the site names, and only as "Founder Sachin Kumar" in the footer.

The tone is calm and handmade: a serif with a brush-cut feel, a quiet sans, warm paper in the day and dark moss at night. One blue is the only color that acts.

**Key Characteristics:**
- Plaster ground, ink line, one blue accent. No other hues.
- One line of one weight family: 4px to 4.5px strokes, round caps.
- Words on the ground, not in boxes. Pictures are real screens, uncovered by frames, except devices.
- Light and dark are both first class. The theme follows the system and `data-theme` on the root overrides it.
- Phone first. The home page has its own drawing for tall screens.

## Colors

A warm paper palette with one ink-blue accent. Both themes define the same names, once each, in `site/src/styles/global.css` (inner pages) and at the top of `site/src/styles/home.css` (home). The values match. The home sheet adds `--faint`, `--strong`, `--device` and `--shade`.

### Primary
- **Ink Blue** (#2e4a8c light, #93a9ec dark): links, the "Write to us" word, the primary pill, the lit joint on the thread, the ball, focus rings. Hover deepens to #223a72 (dark #7790de). Text on it is plaster (#e7e2d6) in light and ink (#1a1a18) in dark.

### Neutral
- **Plaster** (#e7e2d6 light, #1b1e1a dark): the page ground and the fill of joints and sails.
- **Ink** (#1a1a18 light, #e7e2d6 dark): body text and display type.
- **Muted Umber** (#5f584e light, #b8b09f dark): notes, captions, dashed lifts, small labels.
- **Line Moss** (#2a2f28 light, #cfc8b8 dark): the thread, twigs, joints, dots, the selected segment, the drop button body.
- **Faint** (#b8b09f light, #5f584e dark, home only): scrollbar thumb.
- **Device Black** (#2a2f28 light, #0b0c0a dark, home only): the bezel around the Frame Board TV and phone.
- **Screen Backing** (#1c1814, both themes): the dark behind a screenshot while it loads or crops. Used on `.shot`, `.crop` and `.ph`.
- **Shade** (rgb(26 26 24 / .5) light, rgb(0 0 0 / .7) dark, home only): shadow color for devices and the drop button.

### Named Rules
**The One Voice Rule.** Blue is the only color that acts. If something can be pressed, lit or followed, it is blue. If it is structure, it is line. Nothing else gets a hue.

**The Two Themes Rule.** A color is defined once per theme as a custom property. No component writes a raw color, apart from the screen backing noted above.

## Typography

**Display Font:** Kaisei Opti, 400 and 700 (fallbacks Hiragino Mincho ProN, Yu Mincho, serif)
**Body Font:** Zen Kaku Gothic New, 400, 500 and 700 (fallbacks Hiragino Sans, Yu Gothic, system-ui, sans-serif)

All five font files are served from `site/public/fonts` as woff2 with `font-display: swap`. Nothing loads from a third party.

**Character:** A serif with calligraphic shapes for everything that speaks, a round, even sans for everything that explains.

### Hierarchy
- **Display** (serif 400, clamp(2.6rem, 5.3vw, 4.75rem), 1.08, -0.012em): the home h1 (clamp 2.5rem to 4.75rem, 2.05rem on phones) and inner page titles (`.display`, `.prose h1` to 3.5rem).
- **Headline** (serif 400, clamp(2.3rem, 4.4vw, 3.9rem), 1.06): home section titles (h2). The motto runs to 5.2rem and the closing "Say hello." to 7.5rem.
- **Title** (serif 400, clamp(1.35rem, 2.1vw, 1.85rem), 1.32, max 22em): ledes under each title, figure captions, About lead. Larger serif passages run to 2.2rem for the learned list and next-project link.
- **Statement** (serif, 1.3rem, 1.35): the live sentences on the home page (the since line, the verdict, the round count, the sums).
- **Body** (sans 400, 17px, 1.6, max 34em): all running text. Lead paragraphs on inner pages are 1.4rem at 1.45.
- **Small** (sans, 15px, 1.55, muted): notes and table text. The home note is 0.92rem.
- **Label** (sans 500, 15px): thread labels, links, segment buttons. Phones drop thread labels to 13px.
- **Stat** (serif, clamp(3.2rem, 6vw, 5.2rem), 1): the three ledger figures on the Method page.

### Named Rules
**The Two Voices Rule.** The serif says things. The sans explains them. Do not set paragraphs in the serif except the larger lead passages named above, and never set display lines in the sans.

**The Tabular Rule.** Any figure that changes on screen (counts, dates, rows) uses tabular numerals.

**The No Lonely Word Rule.** Headings balance their lines. Running text (`p`, `li`, `figcaption`) uses `text-wrap: pretty`, so no paragraph ends on one word.

## Layout

One column of content, 1312px at most, centered, with a fluid gutter of clamp(20px, 4.4vw, 64px). Body text never runs wider than 34em. Sections are separated by space alone: clamp(96px, 13vw, 190px) on the home page and clamp(88px, 10vw, 150px) between inner page blocks.

**Home page.** A full-screen hero holds the title, one sentence and the drop button, with the thread drawn behind and to the right. Below it, each section is a pair: words in a 5-part column, a 120px channel where the thread runs, and the thing in a 7-part column. Pairs flip sides in turn. Between ports, the page sticks a globe for a scroll leg (185svh tall) while the route draws the next stretch. The ship sits at the motto.

**Inner pages.** A 12-column grid with a 24px gap. A section is a label in columns 1 to 4 and a body in columns 5 to 10. Figures take 5 to 12, or the full width when marked wide.

**Breakpoints.**
- 900px, tablet: the home pair collapses to one column with a 56px channel, the thread moves to the right edge, plans stack, the globe sits above the words, and the phone drops below the TV.
- 760px, phone: the hero copy narrows to leave the drawing, h1 becomes 2.05rem, the TV crops to the column the phone changes, and the phone grows to 46% width.
- Tall drawing: whenever the screen is 760px wide or less, or taller than it is wide (a tablet held upright), the home page swaps its wide thread drawing for the tall one. It re-chooses on resize.
- 1000px, inner tablet: the grid is 6 columns, the tablet figure shows, the path goes to 2 columns.
- 640px, inner phone: one column, the phone figure shows, ledger and path go single.
- 600px: the method table turns into stacked rows with labels.

## Elevation & Depth

Flat. Depth comes from the line and from space, not from shadow. Product plates and screenshots on inner pages carry no frame, no padding and no drop shadow. They sit on the plaster as they are.

The only shadows belong to physical things on the home page: the drop button (a soft lift and a thin top highlight, which presses in on tap), and the Frame Board TV and phone, which cast a long, soft, low shadow like an object on a table. The shadow color is the theme's shade.

### Named Rules
**The Plates Are Flat Rule.** A picture of a screen gets no drop shadow, no border and no frame. Only a device we draw around a screen (TV, phone) has a bezel and a shadow.

## Shapes

Round and plain. Pills (999px) for every pressable control. 12px on a screenshot crop and phone shot. 10px on the TV. A phone bezel is rounded 11% by 5.2%. Focus rings are 2px blue with a 4px offset and a 6px radius. The line has round caps and joins. Joints are rings (a plaster fill with a 3px line stroke) that fill blue when lit. Stones and dots are solid circles. The dot field's hollow dot marks the exception.

## Components

### Buttons
- **Shape:** pill, 999px.
- **Primary** (`.btn`): blue fill, plaster text, weight 700, padding 0.95em 1.5em, a 26px arrow that nudges 4px right on hover. Inner pages use a quieter pill of the same colors (`.ask`, weight 500). Hover deepens the blue. Press scales to 0.97 over 160ms.
- **Segment** (`.seg`): a pill track tinted 10% line, with pill buttons at least 44px tall. The selected one fills with line color and plaster text. Used for "Look as" and "Chart".
- **Switch** (`.switch`): a 46 by 26px track and a round knob that turns blue when on.
- **Text link:** ink-blue, weight 500, underline offset 0.22em.

### Port sections
Each port is a pair (words and thing) on the thread, with a knot on the line that lights when the thread reaches it. The words are an h2, a serif lede, a short note and a "go" link. The thing is the product picture or toy. Ports in the lab and "Not built yet" are a two-column list of rings and serif names.

### Plates and device frames
- **Plate:** a real screenshot, width 100%, 12px corner on crops, nothing else. Crops use variables for aspect ratio, width, left and top, so one image serves several framings.
- **Frame Board stage:** the TV is 80% wide with a 10px device-black bezel and a soft shadow. The phone is 19% wide, overlaps the TV's lower right, and is a button. Tapping the phone swaps the board between "before" and "after" images, using a 260ms fade with a 3px blur. On phones the stage is a 4/5 crop of the TV and the phone sits below at 46%.

### The drop-a-change rig
The hero button is an 84px dark disc with a blue inner dot (72px on phones, 60px for the small send button). Pressing it drops a change onto the drawn thread. The change travels through the agent stops, and a running tally says how many changes went through and how many took the founder's time. A status line under the button names who touches it. With reduced motion the result appears at once.

### The Blackfin gate test
A vertical rail of rings (the gates) with a blue ball that drops down it when the small drop button sends an order. It stops at the first gate that refuses. A serif verdict line says what happened.

### Money flow chart pan
A wide chart image (1900 by 1004) sits in a 12px-rounded box that scrolls sideways (`.pan`). The image is 1000px wide on a tablet and 1100px on a phone, so its labels stay readable. On a phone the pan opens so the right edge of the "Money in" label (41% across the image) meets the edge of the screen, with Paychecks in view too. On a tablet it opens at the start, title included. A segment button swaps between two charts with a fade. The script scrolls the pan to its end or start when the view changes, smoothly unless reduced motion is on. Every Rich Life picture on the site comes from one demo household on one day (October 31), so the figures in the pictures, the rows and the alt text agree.

### Blackfin live figure
One number, the account's percent change since it went live, set in the display serif at clamp(2.8rem, 5.4vw, 4.4rem) with tabular numerals and a true minus sign. The page prints the last snapshot. Where `/api/blackfin-live` answers, the script replaces it each minute and on return to the tab. A reading under three minutes old turns the small dot blue with a slow pulse and says "Live at {time} New York time."; an older one says "Last read {day} at {time} New York time." A changed number flashes from blue to ink once. Reduced motion drops the pulse and the flash.

### Atlas demo figure
An invented 150-room hotel, three room kinds as horizontal bars. Each bar splits rooms booked into four strengths of the line color, darkest booked furthest ahead, and ends in blue for rooms left. A pill row of seven nights, named by weekday only so the demo never dates, picks the night; on a phone the seven share the row evenly. One serif line under the bars says how many rooms are left that night. The numbers live in `atlas-demo.json`, which `atlas-data-check.mjs` proves add up.

### Globe
A canvas globe, drawn in the line colors, shows the route behind the ship. The route is dashed ahead of the ship and solid behind. Port labels pick the free spot that covers the least route. It redraws on scroll and on theme change.

### Inner page parts
A page head (h1, lede, links, optional figure), sections (label and body), a six-step path with serif step names, a three-figure ledger, a table with space between rows and no rules, a principles list with no numbers, and a close with one pill and one serif "next" link with a blue arrow.

### Navigation
A serif wordmark "Parvis Labs" on the left and "Write to us" in blue on the right. No menu. The footer carries the founder line and three links: the method, principles and About. A skip link is the first thing in the tab order.

## Motion

- Easing is `cubic-bezier(0.23, 1, 0.32, 1)` (ease-out) for presses and fades, and `cubic-bezier(0.77, 0, 0.175, 1)` (ease-in-out) for movement.
- Presses scale to 0.97. Control changes take 160ms. Fades take 260ms. A joint fills over 900ms to cool and 120ms to light.
- Hover effects run only when a fine pointer can hover.
- Reduced motion is respected in three places. All transitions drop to 1ms. The globe scroll legs become plain sections, with no sticky stage. The script skips easing, animation frames, waits and smooth scrolling, and shows end states directly.

## Do's and Don'ts

### Do:
- **Do** use the tokens by name. A new color is a new token in both themes, or it is not added.
- **Do** draw new diagrams in the one line: 4px to 4.5px stroke, round caps, ring joints, solid stones.
- **Do** put a new product on the thread as a port, with words on one side and the thing on the other.
- **Do** show a real screen as a plate, with no frame and no shadow.
- **Do** keep every pressable thing a pill and at least 44px tall.
- **Do** check light and dark, 390px and 1440px, and a tall tablet before shipping a page.
- **Do** respect reduced motion in any new animation.

### Don't:
- **Don't** put a box, card, border or rule around content. Space and the line separate things.
- **Don't** add a second accent color, a gradient or a glow.
- **Don't** put a drop shadow on a plate or on text.
- **Don't** name the historical captain of the voyage, on any page or in any alt text.
- **Don't** load fonts or scripts from a third party.
- **Don't** put a real person's name, an email address or a household figure on the page. The only name is "Parvis Labs" with "Founder Sachin Kumar".
- **Don't** show results, gains or losses for Blackfin. Show its method, its schedule and its refusals.

### Drift not canonized
- The home sheet and the inner sheet each define the palette (same values, different names: `--ground` and `--bg`, `--display` and `--serif`, `--text` and `--sans`). Treat them as one system. A shared source is a pending cleanup.
- Screen Backing #1c1814 is the one raw color outside the tokens. It sits behind a screenshot only.
- Inner pages use `.lbl` for a 14px muted label on the method path while the home sheet uses `.lbl` for 15px thread labels. The names collide but the pages do not share a sheet.
