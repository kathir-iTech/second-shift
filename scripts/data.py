"""Build compact, deidentified review data from UCI 498. Use a local zip as argv[1]."""
import csv, io, json, sys, zipfile
from pathlib import Path
from collections import defaultdict
groups=defaultdict(list)
with zipfile.ZipFile(sys.argv[1]) as archive:
    for row in csv.DictReader(io.TextIOWrapper(archive.open("incident_event_log.csv"))):
        groups[row["number"]].append((int(row["sys_mod_count"]),*[row[k].split(" - ")[-1] for k in ("impact","urgency","priority")]))
records=[]
for key, history in sorted(groups.items()):
    first=min(history)[1:]
    last=max(history)[1:]
    records.append([key,*first,*last])
Path(__file__).resolve().parents[1].joinpath("src/corpus.json").write_text(json.dumps(records,separators=(",",":")),encoding="utf-8")

