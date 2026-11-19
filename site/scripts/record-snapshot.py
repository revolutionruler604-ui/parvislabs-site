#!/usr/bin/env python3
"""Write the public record snapshot from the route log.

Usage: record-snapshot.py --log <routes.jsonl> --out <record.json>

The output holds dates and counts only: merged changes that an agent other
than the builder reviewed, bugs found in them after merge, where those changes
sit in merge order, how many took any of the founder's time, and how many
minutes of it they took together. A change that
merged on the automated checks alone (reviewer label starting "gates") is left
out, so every figure is about reviewed changes. It never holds an item name,
a project, a builder or a reviewer.
"""
import argparse
import json


def rows(path):
    out = []
    with open(path, encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if line:
                out.append(json.loads(line))
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--log", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    merged = [
        row for row in rows(args.log)
        if row.get("outcome") == "merged" and not str(row.get("reviewer", "gates")).lower().startswith("gates")
    ]
    if not merged:
        raise SystemExit("record-snapshot: the log holds no reviewed, merged change")
    merged.sort(key=lambda row: row["date"])  # stable: same-day rows keep log order

    snapshot = {
        "from": merged[0]["date"],
        "asOf": merged[-1]["date"],
        "reviewed": len(merged),
        "foundAfterMerge": sum(int(row.get("escaped", 0)) for row in merged),
        "foundAt": [i for i, row in enumerate(merged) if int(row.get("escaped", 0)) > 0],
        "tookFounderTime": sum(1 for row in merged if row.get("sachin_min", 0) > 0),
        "founderMinutes": sum(row.get("sachin_min", 0) for row in merged),
    }
    with open(args.out, "w", encoding="utf-8") as handle:
        json.dump(snapshot, handle, indent=2)
        handle.write("\n")
    print("record-snapshot: %(reviewed)d reviewed and merged from %(from)s to %(asOf)s, %(foundAfterMerge)d found after merge, %(tookFounderTime)d took founder time" % snapshot)


if __name__ == "__main__":
    main()
