#!/usr/bin/env python3
"""Write the public Blackfin snapshot from the bot's journal.

Usage: blackfin-snapshot.py --journal <journal.jsonl> --candidates <candidates.jsonl> --out <blackfin.json>

The output holds counts and one percent figure. It never holds a dollar value,
a ticker, an order id or an account detail. The percent is the change in the
equity the bot journals at the start of each run, first live run to latest.
"""
import argparse
import json
from decimal import Decimal, ROUND_HALF_UP

LIVE = "2026-11-02"


def rows(path):
    out = []
    with open(path, encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if line:
                out.append(json.loads(line))
    return out


def kind(row):
    return row.get("event") or row.get("type") or row.get("kind")


def day(row):
    return str(row.get("date") or row.get("ts") or row.get("filled_at") or "")[:10]


def snapshot(journal, candidates):
    live = [r for r in journal if day(r) >= LIVE]
    buys = sum(1 for r in live if kind(r) == "FILL_CONFIRMED" and r.get("side") == "buy")
    sells = sum(1 for r in live if kind(r) == "FILL_CONFIRMED" and r.get("side") == "sell")
    read = [r for r in candidates if str(r.get("date")) >= LIVE]
    runs = [r for r in live if kind(r) == "RUN_START"]
    priced = [r for r in runs if r.get("equity") not in (None, "")]
    change = None
    if len(priced) >= 2:
        first, last = Decimal(str(priced[0]["equity"])), Decimal(str(priced[-1]["equity"]))
        if first > 0:
            change = str(((last - first) / first * 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
    return {
        "liveSince": LIVE,
        "asOf": max(day(r) for r in live) if live else None,
        "tradingDays": len({str(r.get("date")) for r in read}),
        "companiesRead": len(read),
        "entriesRefused": sum(1 for r in live if kind(r) == "ENTRY_REFUSED"),
        "tradesOpened": buys,
        "tradesClosed": sells,
        "changePct": change,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--journal", required=True)
    parser.add_argument("--candidates", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    data = snapshot(rows(args.journal), rows(args.candidates))
    with open(args.out, "w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2)
        handle.write("\n")
    print(json.dumps(data))


if __name__ == "__main__":
    main()
