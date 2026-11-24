---
title: Blackfin
order: 2
status: Live since November 2, 2026
featured: true
seed: ""
line: "A trading bot that works alone, inside limits it cannot change."
links: []
draft: false
---

## The problem

A trading bot left alone with an account needs limits it cannot change.

## What it does

Blackfin is a trading bot that works alone. At 10:32 a.m. New York time each trading day, it follows its written steps and scans for small companies whose shares jumped on earnings. A candidate must pass three checks, on price, volume and the earnings beat. Each candidate and the result of its checks goes into the journal, the log of everything the bot does. A buy starts as an order ticket written there.

Any order then meets a guard: code the bot cannot edit, live since November 12, 2026. The bot can trade only its own account. A buy must match a ticket in the journal, and a sell can never exceed the shares held. A buy is capped at a share of the account's value, taken from a figure the bot cannot write.

At 3:45 p.m. the bot tends what it holds. Each position has a stop held by the broker at the day's low as of the morning scan, and is sold after ten trading days if the stop never triggers.

It went live on November 2, 2026, with a written rule for when to stop. Its first trades came on November 4 and 5, each with a stop held by the broker.

## How it was built

The architect plans and reviews. Builder agents write the bot. Claude Opus read every change to the guard. Before it went live, the founder watched a dry run try to break it with real tool calls: a buy on a fake account, a buy with no ticket, a sell of shares it does not hold. Each was refused. Every test order was priced at one cent, so even a failed guard could not have filled it.

## What we learned

- A rule written in a prompt is a request. A rule written in code is a guard.
- A guard keeps a saved copy of the broker's real inputs, and a test checks every field the guard expects against that copy.
