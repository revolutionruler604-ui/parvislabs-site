---
title: Frame Board
order: 3
status: Live at home
featured: true
seed: One screen.
line: "The kitchen TV becomes a paper notice board. The phone is the remote."
links: []
draft: true
---

## The problem

A household keeps its calendar, chores, groceries and notes in different places. The kitchen TV is in view all day, but nobody taps a TV. A board on it has to stay current with almost no effort.

## What it does

Frame Board turns the kitchen TV into a notice board that looks like paper. Mornings and evenings it shows today and the weather, the week's calendar, chores, groceries, notes and the egg count, with its fourteen-day trend beside the hours of daylight. The rest of the day, the TV goes back to showing art.

The phone is the remote. A home-screen app logs an egg with one tap, ticks a chore, adds a grocery or posts a note. The board refreshes every five minutes and right after a tap, and a tap reaches the TV in about twelve seconds. A mistaken tap can be undone from a bar on the phone.

A small computer in the house draws each board as a 4K picture, sends it to the TV and deletes the one before.

## How it was built

Builder agents write the code, each in its own copy, on invented sample data. Three board designs were built and judged side by side, and the winner, a broadsheet layout on bone-colored paper, is the one on the TV. Every change ends with a final check: the unit tests, plus a sweep that fails if any value from the house's private settings turns up in the code. In each part of the code, network calls go through one function, so tests can stand in for them and never reach the internet.

## What we learned

- A program started by a signed-in user could not reach the TV. One that starts with the computer itself could, so the board runs that way and restarts on its own when the code changes.
