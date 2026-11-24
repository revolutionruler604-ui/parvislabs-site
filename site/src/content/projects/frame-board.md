---
title: Frame Board
order: 3
status: Live at home
featured: true
seed: One house.
line: "The family's home operating system. The phone runs the house, and the kitchen TV shows it."
links: []
draft: false
---

## The problem

A family runs on a calendar, chores, groceries, notes and timers. A baby adds a log of every feed and diaper, often written at night in a dark room. Each lives in a different app. The kitchen TV is in view all day, but nobody taps a TV. The family needs one place for all of it, with almost no effort.

## What it does

Frame Board is the family's home operating system. A phone app called Egloo is the remote for the whole house, and the kitchen TV is the screen everyone already walks past.

The baby log sits at the top of the app. One tap starts the nursing clock on either side, and the app marks which side is next. Bottles, pumping, diapers and sleeps log with one tap too. Any entry can be added late or fixed afterward. At night the app turns a dim red, so a parent's eyes stay used to the dark. A parent's phone gets an alert when a feed is overdue, a feed runs long, or too few diapers are logged by evening.

The TV reads the whole log. One view shows the last day and the last week. Another sets the week's averages beside the typical ranges published for parents, lays out two weeks of sleep and feeds one row a day, and follows the longest stretch of each night. Sleep nobody logged is estimated from the quiet gaps between entries, and drawn apart from the sleep that was logged.

The rest of the house runs from the same app. Count the hens' eggs, tick a chore, post a note or set a timer, and the board shows it in about twelve seconds. Groceries stay on the phone. Set the thermostat, run a sprinkler zone or pause the watering for rain. Put a recipe on the TV and turn its pages with the remote. A privacy switch hides calendar and to-do titles and people's names on the board when guests come over. The phone shows who changed what, and a mistaken tap can be undone.

During the day the TV shows a board that looks like paper: today and the weather, the next few days, to-dos, the week's dinners, chores, notes and the egg count. The rest of the time it shows art: a public-domain painting picked for the season, and collages of family photos made fresh each week.

A small computer in the house draws each board as a 4K picture, sends it to the TV and deletes the one before.

## How it was built

Builder agents write the code, each in its own copy, on invented sample data. Three board designs were built and judged side by side, and the winner, a broadsheet layout on bone-colored paper, is the one on the TV. Every change ends with a final check: the unit tests, plus a sweep that fails if any value from the house's private settings turns up in the code. In almost every part of the code, network calls go through one function, so tests can stand in for them and never reach the internet.

## What we learned

- A program started by a signed-in user could not reach the TV. One that starts with the computer itself could, so the board runs that way and restarts on its own when the code changes.
- A guess shown as a fact misleads. Estimated sleep is drawn hollow and says "about", and the published ranges are shown as ranges, never as targets.
