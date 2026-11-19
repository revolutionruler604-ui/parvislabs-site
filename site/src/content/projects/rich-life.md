---
title: Rich Life
order: 1
status: Early access
featured: true
seed: One number.
line: "Every dollar counted once, for two people with one plan."
links:
  - label: See Rich Life
    href: https://richlife.parvislabs.com/
draft: true
---

## The problem

A couple shares bills and a plan, and each partner also spends on their own. Pay a card from checking, split dinner on Venmo, move money to savings, and the same dollars land on two or three statements. Add them up and the numbers are wrong. Each partner also wants some spending that stays theirs.

## What it does

Rich Life puts a couple's accounts in one place and counts every dollar once. A card payment is matched to the card it paid. A Venmo charge is matched to the account that funded it.

Home opens on one number: guilt-free money left this month. Every figure opens to the rows behind it, with the reason any row is left out. Together holds the shared plan and builds the agenda for a monthly money meeting.

Both partners see the whole household. One exception: guilt-free purchases on an account that is yours alone show to your partner only as a monthly total and count per category. The purchases themselves never reach your partner's screen, unless you choose to share a category.

## How it was built

An architect agent writes each change as a brief with a failing test, built on invented households. A builder agent makes the change. Anything that touches money, sign-in or privacy is read by a reviewer from a different model family. Every money fix carries a mutation check: undo the fix, and a test must fail. Sums run in whole cents, and each partner plus the joint accounts must equal the household to the cent. Every Sunday at 3 a.m., every screen is tested end to end in a real browser.

## What we learned

- A money app that is wrong once gets double-checked forever.
- One Venmo payment between partners can leave up to three rows: the card that funded it, the sender's Venmo row and the receiver's. Rich Life pairs them, so the payment counts once in every view.
