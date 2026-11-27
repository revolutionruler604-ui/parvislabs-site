---
title: Method
description: An architect plans the change and writes its test. A builder makes it. A reviewer who did not build it reads it. The founder decides.
---

# How a change ships here

The first version of this site went from brief to its second fix in 23 minutes. One agent wrote the plan. A second, on a low-cost model, built it. A third, on a different model family, found seven problems. A fourth checked the fixes and found a flaw in the test that tests the checker. None of it goes live until the founder says so.

## The path

Six steps, one owner each.

**Plan.** An architect agent writes a brief. It opens with one command that proves the change works against something real, and what that command prints on success.

**Build.** A builder agent works in its own copy of the code, on the files the brief allows. It saves at each passing step. If the same error comes back twice, it stops and hands back a report.

**Review.** A reviewer agent reads the change. The rule: the agent that builds a change never reviews it. In most changes the reviewer also runs on a different model family. A serious finding must name the line and an input that breaks it.

**Fix.** Findings go back to the builder in a fix brief, by number. The rule: after two reviews that hold a change, it is cut down or rethought.

**Decide.** The founder makes four kinds of call: whether to build at all, money and privacy policy, anything the public sees, and a loop that will not close. Other changes merge on the checks. Of the {reviewed} changes in the ledger below, {none} took none of the founder's time.

**Record.** Each change is logged: builder, reviewer, rounds, serious findings, founder minutes, and any bug found after it merged.

## One change, on its way through

The brief for this site's skeleton was saved at 11:33 pm on November 12, 2026. It asked for the site's pages with no design yet, and two scripts. One opens each page in a real browser at phone and desktop width and fails on a console error. The other reads each page for things that must not ship, from em dashes to scripts loaded from other sites.

The builder finished in under ten minutes, then planted 17 faults in a scratch copy. The checker caught all 17.

A reviewer from a different model family tried to break the checks and returned seven findings. Among them:

- Every project page was marked as a draft, and nothing failed because of it.
- The em dash check missed a dash written as an HTML code.
- The checker passed a build with no pages at all.

The first fix closed all seven. It added a release check that fails while any page is still a draft, and it turned the builder's planted faults into a permanent self-test of the checker.

A second verifier read that fix, and its findings went into a second fix brief. One was a flaw in the self-test itself: one planted fault tested nothing, and the self-test would have failed on the day the drafts were approved.

The second fix closed that flaw and one more gap. The self-test then planted 34 faults and caught 34. To prove the new cases count, the builder put the old checker back, and the self-test dropped to 31 of 34. One more verifier finding, in the screenshot script, was left for a later round.

The change merged into the site's working branch on November 13, 2026.

## The ledger

From {span}:

- {reviewed} changes went through review and merged.
- {found} of them later turned out to have a bug.
- {none} took none of the founder's time. All {reviewed} together took {minutes} minutes of it.

## Limits in code

Some limits run on their own, whatever the brief says.

- Each save to the shared history is scanned first. An email address, a key or token, or a term on a private list stops it. The scan names the file and line, never the text.
- The tool that starts builders refuses the costlier tier of the build model.

The brief adds rules in words: never publish, never skip the scan, and stop and report when a check blocks. A builder that stops hands back a report and its saved work, and the architect writes the next brief.

## How work is checked

- The proof runs against something real. Unit tests alone are not proof.
- How closely a change is read depends on what it touches. Money math, and the engines that compute figures, get a read from the most capable model before they merge, and that read replaces the cheaper review.
- On high-risk changes, a second agent tries to disprove each serious finding. What it disproves is dropped, and so are findings about style alone.
- The rule for testing reviewers: a bug found after merge is kept with its test, and when a reviewer's instructions or model change, the reviewer is run against that list again.
- Free models never see real data or secrets.
- The rule for this site: every published word is reviewed by a model that did not write it, and for most wording that review is enough. A new page or a full rework also waits for the founder's yes.


<div class="method-table-wrap">
  <table class="method-table">
    <caption>Who builds and who reviews, by risk</caption>
    <thead>
      <tr><th scope="col">What it touches</th><th scope="col">Who builds</th><th scope="col">Who reviews</th><th scope="col">Extra checks</th></tr>
    </thead>
    <tbody>
      <tr><td data-label="What it touches">Copy, docs, tests, screens with no money figure</td><td data-label="Who builds">Low-cost model; screens go to a mid-tier model that can open a browser</td><td data-label="Who reviews">One automated review</td><td data-label="Extra checks">The gates (build, tests, screen sweeps)</td></tr>
      <tr><td data-label="What it touches">Ordinary product and screen logic</td><td data-label="Who builds">Low-cost model</td><td data-label="Who reviews">A different model family</td><td data-label="Extra checks">The gates</td></tr>
      <tr><td data-label="What it touches">Sign-in and sessions, privacy filters, stored secrets, file parsers, deploy scripts</td><td data-label="Who builds">Low-cost model</td><td data-label="Who reviews">A different model family</td><td data-label="Extra checks">A skeptic on each serious finding, planted faults, known-answer checks</td></tr>
      <tr><td data-label="What it touches">Money math and engines</td><td data-label="Who builds">Low-cost model</td><td data-label="Who reviews">The most capable model, in place of the cheaper review</td><td data-label="Extra checks">As above</td></tr>
    </tbody>
  </table>
</div>

## How it gets better

The rule: a correction becomes a lesson, and the strongest lessons become checks. An agent launched with no model named falls back to the smallest one (found October 21, 2026). Naming the model is now a written rule for every review, and a check refuses to launch a batch of agents until each one names its model.

The rule: a fault flagged twice becomes a test or a check.
